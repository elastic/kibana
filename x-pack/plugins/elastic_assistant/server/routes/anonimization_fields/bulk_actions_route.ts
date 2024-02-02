/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { IKibanaResponse, KibanaResponseFactory, Logger } from '@kbn/core/server';

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
} from '@kbn/elastic-assistant-common';

import { SavedObjectError } from '@kbn/core/types';
import {
  AnonymizationFieldResponse,
  BulkActionSkipResult,
  BulkCrudActionResponse,
  BulkCrudActionResults,
  BulkCrudActionSummary,
  PerformBulkActionRequestBody,
  PerformBulkActionResponse,
} from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { ANONYMIZATION_FIELDS_TABLE_MAX_PAGE_SIZE } from '../../../common/constants';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildRouteValidationWithZod } from '../route_validation';
import { buildResponse } from '../utils';

export interface BulkOperationError {
  message: string;
  status?: number;
  anonymizationField: {
    id: string;
    name: string;
  };
}

export type BulkActionError = BulkOperationError | unknown;

const buildBulkResponse = (
  response: KibanaResponseFactory,
  {
    errors = [],
    updated = [],
    created = [],
    deleted = [],
    skipped = [],
  }: {
    errors?: SavedObjectError[];
    updated?: AnonymizationFieldResponse[];
    created?: AnonymizationFieldResponse[];
    deleted?: string[];
    skipped?: BulkActionSkipResult[];
  }
): IKibanaResponse<BulkCrudActionResponse> => {
  const numSucceeded = updated.length + created.length + deleted.length;
  const numSkipped = skipped.length;
  const numFailed = errors.length;

  const summary: BulkCrudActionSummary = {
    failed: numFailed,
    succeeded: numSucceeded,
    skipped: numSkipped,
    total: numSucceeded + numFailed + numSkipped,
  };

  const results: BulkCrudActionResults = {
    updated,
    created,
    deleted,
    skipped,
  };

  if (numFailed > 0) {
    return response.custom<BulkCrudActionResponse>({
      headers: { 'content-type': 'application/json' },
      body: {
        message: summary.succeeded > 0 ? 'Bulk edit partially failed' : 'Bulk edit failed',
        status_code: 500,
        attributes: {
          errors: [],
          results,
          summary,
        },
      },
      statusCode: 500,
    });
  }

  const responseBody: BulkCrudActionResponse = {
    success: true,
    anonymization_fields_count: summary.total,
    attributes: { results, summary },
  };

  return response.ok({ body: responseBody });
};

export const bulkActionAnonymizationFieldsRoute = (
  router: ElasticAssistantPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
      options: {
        tags: ['access:elasticAssistant'],
        timeout: {
          idleSocket: moment.duration(15, 'minutes').asMilliseconds(),
        },
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PerformBulkActionRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<PerformBulkActionResponse>> => {
        const { body } = request;
        const assistantResponse = buildResponse(response);

        if (body?.update && body.update?.length > ANONYMIZATION_FIELDS_TABLE_MAX_PAGE_SIZE) {
          return assistantResponse.error({
            body: `More than ${ANONYMIZATION_FIELDS_TABLE_MAX_PAGE_SIZE} ids sent for bulk edit action.`,
            statusCode: 400,
          });
        }

        const abortController = new AbortController();

        // subscribing to completed$, because it handles both cases when request was completed and aborted.
        // when route is finished by timeout, aborted$ is not getting fired
        request.events.completed$.subscribe(() => abortController.abort());
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant']);
          const dataClient = await ctx.elasticAssistant.getAIAssistantAnonymizationFieldsSOClient();

          const docsCreated =
            body.create && body.create.length > 0
              ? await dataClient.createAnonymizationFields(body.create)
              : [];
          const docsUpdated =
            body.update && body.update.length > 0
              ? await dataClient.updateAnonymizationFields(body.update)
              : [];
          const docsDeleted = await dataClient.deleteAnonymizationFieldsByIds(
            body.delete?.ids ?? []
          );

          const created = await dataClient?.findAnonymizationFields({
            page: 1,
            perPage: 1000,
            filter: docsCreated.map((updatedId) => `id:${updatedId}`).join(' OR '),
            fields: ['id'],
          });
          const updated = await dataClient?.findAnonymizationFields({
            page: 1,
            perPage: 1000,
            filter: docsUpdated.map((updatedId) => `id:${updatedId}`).join(' OR '),
            fields: ['id'],
          });

          return buildBulkResponse(response, {
            updated: updated?.data,
            created: created?.data,
            deleted: docsDeleted.map((d) => d.id) ?? [],
            errors: docsDeleted.reduce((res, d) => {
              if (d.error !== undefined) {
                res.push(d.error);
              }
              return res;
            }, [] as SavedObjectError[]),
          });
        } catch (err) {
          const error = transformError(err);
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
