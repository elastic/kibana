/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BulkRequest,
  BulkResponse,
  BulkOperationContainer,
  MgetResponseItem,
} from '@elastic/elasticsearch/lib/api/types';

import { Logger, ElasticsearchClient } from '@kbn/core/server';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';

import { set } from '@kbn/safer-lodash-set';
import { zip, get } from 'lodash';

const REFRESH_FIELDS_ALWAYS = [
  'kibana.alert.workflow_status',
  'kibana.alert.workflow_tags',
  'kibana.alert.case_ids',
];
const REFRESH_FIELDS_CONDITIONAL = ['kibana.alert.status'];

const REFRESH_FIELDS = [...REFRESH_FIELDS_ALWAYS, ...REFRESH_FIELDS_CONDITIONAL];

export interface ResolveAlertConflictsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  bulkRequest: BulkRequest<unknown, unknown>;
  bulkResponse: BulkResponse;
}

interface NormalizedBulkRequest {
  op: BulkOperationContainer;
  doc: unknown;
}

export async function resolveAlertConflicts(params: ResolveAlertConflictsParams): Promise<void> {
  const { logger, esClient, bulkRequest, bulkResponse } = params;

  const errorsInResponse = (bulkResponse.items ?? [])
    .map((item) => item?.index?.error || item?.create?.error)
    .filter((item) => item != null);

  if (errorsInResponse.length === 0) return;

  const normalizedRequest = getConflictRequest(bulkRequest, bulkResponse);

  logger.error(
    `Error writing ${errorsInResponse.length} out of ${
      bulkResponse.items.length
    } alerts - ${JSON.stringify(errorsInResponse)}`
  );

  const freshDocs = await getFreshDocs(esClient, normalizedRequest);
  await updateOCC(normalizedRequest, freshDocs);
  await refreshFieldsInDocs(normalizedRequest, freshDocs);

  logger.info(`Retrying bulk update of ${normalizedRequest.length} conflicted alerts`);

  const mbrResponse = await makeBulkRequest(params.esClient, params.bulkRequest, normalizedRequest);

  if (mbrResponse.bulkResponse?.items.length !== normalizedRequest.length) {
    const actual = mbrResponse.bulkResponse?.items.length;
    const expected = normalizedRequest.length;
    logger.error(
      `Unexpected number of bulk response items retried; expecting ${expected}, retried ${actual}`
    );
    return;
  }

  if (mbrResponse.error) {
    const index = bulkRequest.index || 'unknown index';
    logger.error(
      `Error writing ${normalizedRequest.length} alerts to ${index} - ${mbrResponse.error.message}`
    );
    return;
  }

  if (mbrResponse.errors === 0) {
    logger.info(`Retried bulk update of ${normalizedRequest.length} conflicted alerts succeeded`);
  } else {
    logger.error(
      `Retried bulk update of ${normalizedRequest.length} conflicted alerts still had ${mbrResponse.errors} conflicts`
    );
  }
}

interface MakeBulkRequestResponse {
  bulkRequest: BulkRequest;
  bulkResponse?: BulkResponse;
  errors: number;
  error?: Error;
}

async function makeBulkRequest(
  esClient: ElasticsearchClient,
  bulkRequest: BulkRequest,
  conflictRequest: NormalizedBulkRequest[]
): Promise<MakeBulkRequestResponse> {
  const operations = conflictRequest.map((req) => [req.op, req.doc]).flat();
  const updatedBulkRequest = { ...bulkRequest, operations };

  let bulkResponse: Awaited<ReturnType<typeof esClient.bulk>>;
  try {
    bulkResponse = await esClient.bulk(updatedBulkRequest);
  } catch (error) {
    return { bulkRequest, errors: 0, error };
  }

  const errors = bulkResponse.items.filter((item) => item.index?.error).length;
  return { bulkRequest, bulkResponse, errors };
}

/** Update the certain fields in the conflict requests with fresh data. */
async function refreshFieldsInDocs(
  conflictRequests: NormalizedBulkRequest[],
  freshResponses: MgetResponseItem[]
) {
  for (const [conflictRequest, freshResponse] of zip(conflictRequests, freshResponses)) {
    if (!conflictRequest?.op.index || !freshResponse) continue;

    // @ts-expect-error @elastic/elasticsearch _seq_no is not in the type!
    const freshDoc = freshResponse._source;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conflictDoc = conflictRequest.doc as Record<string, any>;
    if (!freshDoc || !conflictDoc) continue;

    for (const refreshField of REFRESH_FIELDS_ALWAYS) {
      const val = get(freshDoc, refreshField);
      set(conflictDoc, refreshField, val);
    }

    // structured this way to make sure all conditional refresh
    // fields are listed in REFRESH_FIELDS_CONDITIONAL when we mget
    for (const refreshField of REFRESH_FIELDS_CONDITIONAL) {
      switch (refreshField) {
        // hamdling for kibana.alert.status: overwrite conflict doc
        // with fresh version if it's not active or recovered (ie, untracked)
        case ALERT_STATUS:
          const freshStatus = get(freshDoc, ALERT_STATUS);

          if (freshStatus !== ALERT_STATUS_ACTIVE && freshStatus !== ALERT_STATUS_RECOVERED) {
            set(conflictDoc, ALERT_STATUS, freshStatus);
          }
          break;
      }
    }
  }
}

/** Update the OCC info in the conflict request with the fresh info. */
async function updateOCC(conflictRequests: NormalizedBulkRequest[], freshDocs: MgetResponseItem[]) {
  for (const [req, freshDoc] of zip(conflictRequests, freshDocs)) {
    if (!req?.op.index || !freshDoc) continue;

    // @ts-expect-error @elastic/elasticsearch _seq_no is not in the type!
    const seqNo: number | undefined = freshDoc._seq_no;
    // @ts-expect-error @elastic/elasticsearch _primary_term is not in the type!
    const primaryTerm: number | undefined = freshDoc._primary_term;

    if (seqNo === undefined) throw new Error('Unexpected undefined seqNo');
    if (primaryTerm === undefined) throw new Error('Unexpected undefined primaryTerm');

    req.op.index.if_seq_no = seqNo;
    req.op.index.if_primary_term = primaryTerm;
  }
}

/** Get the latest version of the conflicted docs, with fields to refresh. */
async function getFreshDocs(
  esClient: ElasticsearchClient,
  conflictRequests: NormalizedBulkRequest[]
): Promise<MgetResponseItem[]> {
  const docs: Array<{ _id: string; _index: string }> = [];

  conflictRequests.forEach((req) => {
    const [id, index] = [req.op.index?._id, req.op.index?._index];
    if (!id || !index) return;

    docs.push({ _id: id, _index: index });
  });

  const mgetRes = await esClient.mget<unknown>({ docs, _source_includes: REFRESH_FIELDS });

  if (mgetRes.docs.length !== docs.length) {
    throw new Error(
      `Unexpected number of mget response docs; expected ${docs.length}, got ${mgetRes.docs.length}`
    );
  }

  return mgetRes.docs;
}

/** Return the bulk request, filtered to those requests that had conflicts. */
function getConflictRequest(
  bulkRequest: BulkRequest,
  bulkResponse: BulkResponse
): NormalizedBulkRequest[] {
  const request = normalizeRequest(bulkRequest);

  if (request.length !== bulkResponse.items.length) {
    throw new Error('Unexpected number of bulk response items');
  }
  if (request.length === 0) return [];

  const conflictRequest = zip(request, bulkResponse.items)
    .filter(([_, res]) => res?.index?.status === 409)
    .map(([req, _]) => req!);

  return conflictRequest;
}

/** Convert a bulk request (op | doc)[] to an array of { op, doc }[] for index op */
function normalizeRequest(bulkRequest: BulkRequest) {
  if (!bulkRequest.operations) return [];
  const result: NormalizedBulkRequest[] = [];

  let index = 0;
  while (index < bulkRequest.operations.length) {
    const op = bulkRequest.operations[index] as BulkOperationContainer;

    if (op.create || op.index || op.update) {
      index++;
      if (op.index) {
        const doc = bulkRequest.operations[index];
        result.push({ op, doc });
      }
    } else if (op.delete) {
      // no doc for delete op
    } else {
      throw new Error(`Unsupported bulk operation: ${JSON.stringify(op)}`);
    }

    index++;
  }

  return result;
}
