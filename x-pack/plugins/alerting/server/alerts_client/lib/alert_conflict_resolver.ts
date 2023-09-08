/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { zip } from 'lodash';

import {
  BulkRequest,
  BulkResponse,
  BulkOperationContainer,
} from '@elastic/elasticsearch/lib/api/types';

import { ElasticsearchClient } from '@kbn/core/server';

interface ResolveAlertConflictsParams {
  esClient: ElasticsearchClient;
  bulkRequest: BulkRequest;
  bulkResponse: BulkResponse;
}

interface ResolveAlertConfictsResult {
  bulkRequest: BulkRequest;
}

interface NormalizedBulkRequest {
  op: BulkOperationContainer;
  doc: unknown;
}

export async function resolveAlertConflicts(
  params: ResolveAlertConflictsParams
): Promise<ResolveAlertConfictsResult> {
  const conflictRequest = getConflictRequest(params);
  await updateOCC(params.esClient, conflictRequest);

  const bulkRequest = {
    operations: conflictRequest.map((req) => [req.op, req.doc]).flat(),
  }
  return { bulkRequest };
}


// change this to do the mget separately from applying the OCC,
// so we can also use the mget to get the current ad-hoc fields of the alert



/** Update the OCC info in the request via mget. */
async function updateOCC(esClient: ElasticsearchClient, conflictRequests: NormalizedBulkRequest[]) {
  const docs: Array<{ _id: string; _index: string }> = [];

  conflictRequests.forEach((req) => {
    const [id, index] = [req.op.index?._id, req.op.index?._index];
    if (!id || !index) return;

    docs.push({ _id: id, _index: index });
  });

  const mgetRes = await esClient.mget<unknown>({ docs, _source: false });

  if (mgetRes.docs.length !== docs.length) {
    throw new Error('Unexpected number of mget response docs');
  }

  for (const [req, doc] of zip(conflictRequests, mgetRes.docs)) {
    if (!req?.op.index || !doc) continue;

    // @ts-expect-error @elastic/elasticsearch _seq_no is not in the type!
    const seqNo: number | undefined = doc._seq_no;
    // @ts-expect-error @elastic/elasticsearch _primary_term is not in the type!
    const primaryTerm: number | undefined = doc._primary_term;

    if (seqNo === undefined) throw new Error('Unexpected undefined seqNo');
    if (primaryTerm === undefined) throw new Error('Unexpected undefined primaryTerm');

    req.op.index.if_seq_no = seqNo;
    req.op.index.if_seq_no = primaryTerm;
  }
}

/** Return the bulk request, filtered to those requests that had conflicts. */
function getConflictRequest(params: ResolveAlertConflictsParams): NormalizedBulkRequest[] {
  const { bulkRequest, bulkResponse } = params;

  const request = normalizeRequest(bulkRequest);

  if (request.length !== bulkResponse.items.length) {
    throw new Error('Unexpected number of bulk response items');
  }

  if (request.length === 0) return [];

  const conflictRequest = zip(request, bulkResponse.items)
    .filter(([req, resp]) => req && resp?.index?.status === 409)
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
