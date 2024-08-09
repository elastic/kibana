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
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
} from '@kbn/elastic-assistant-common';

import {
  AnonymizationFieldResponse,
  AnonymizationFieldsBulkActionSkipResult,
  AnonymizationFieldsBulkCrudActionResponse,
  AnonymizationFieldsBulkCrudActionResults,
  BulkCrudActionSummary,
  PerformBulkActionRequestBody,
  PerformBulkActionResponse,
} from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { ANONYMIZATION_FIELDS_TABLE_MAX_PAGE_SIZE } from '../../../common/constants';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';
import {
  getUpdateScript,
  transformESSearchToAnonymizationFields,
  transformESToAnonymizationFields,
  transformToCreateScheme,
  transformToUpdateScheme,
} from '../../ai_assistant_data_clients/anonymization_fields/helpers';
import {
  EsAnonymizationFieldsSchema,
  UpdateAnonymizationFieldSchema,
} from '../../ai_assistant_data_clients/anonymization_fields/types';
import { UPGRADE_LICENSE_MESSAGE, hasAIAssistantLicense } from '../helpers';

export interface BulkOperationError {
  message: string;
  status?: number;
  document: {
    id: string;
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
    errors?: BulkOperationError[];
    updated?: AnonymizationFieldResponse[];
    created?: AnonymizationFieldResponse[];
    deleted?: string[];
    skipped?: AnonymizationFieldsBulkActionSkipResult[];
  }
): IKibanaResponse<AnonymizationFieldsBulkCrudActionResponse> => {
  const numSucceeded = updated.length + created.length + deleted.length;
  const numSkipped = skipped.length;
  const numFailed = errors.length;

  const summary: BulkCrudActionSummary = {
    failed: numFailed,
    succeeded: numSucceeded,
    skipped: numSkipped,
    total: numSucceeded + numFailed + numSkipped,
  };

  const results: AnonymizationFieldsBulkCrudActionResults = {
    updated,
    created,
    deleted,
    skipped,
  };

  if (numFailed > 0) {
    return response.custom<AnonymizationFieldsBulkCrudActionResponse>({
      headers: { 'content-type': 'application/json' },
      body: {
        message: summary.succeeded > 0 ? 'Bulk edit partially failed' : 'Bulk edit failed',
        attributes: {
          errors: errors.map((e: BulkOperationError) => ({
            status_code: e.status ?? 500,
            anonymization_fields: [{ id: e.document.id, name: '' }],
            message: e.message,
          })),
          results,
          summary,
        },
      },
      statusCode: 500,
    });
  }

  const responseBody: AnonymizationFieldsBulkCrudActionResponse = {
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
        tags: ['access:securitySolution-updateAIAssistantAnonymization'],
        timeout: {
          idleSocket: moment.duration(15, 'minutes').asMilliseconds(),
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PerformBulkActionRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<PerformBulkActionResponse>> => {
        const { body } = request;
        const assistantResponse = buildResponse(response);

        const operationsCount =
          (body?.update ? body.update?.length : 0) +
          (body?.create ? body.create?.length : 0) +
          (body?.delete ? body.delete?.ids?.length ?? 0 : 0);
        if (operationsCount > ANONYMIZATION_FIELDS_TABLE_MAX_PAGE_SIZE) {
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
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          const license = ctx.licensing.license;
          if (!hasAIAssistantLicense(license)) {
            return response.forbidden({
              body: {
                message: UPGRADE_LICENSE_MESSAGE,
              },
            });
          }

          const authenticatedUser = ctx.elasticAssistant.getCurrentUser();
          if (authenticatedUser == null) {
            return assistantResponse.error({
              body: `Authenticated user not found`,
              statusCode: 401,
            });
          }
          const dataClient =
            await ctx.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient();

          if (body.create && body.create.length > 0) {
            const result = await dataClient?.findDocuments<EsAnonymizationFieldsSchema>({
              perPage: 100,
              page: 1,
              filter: `(${body.create.map((c) => `field:${c.field}`).join(' OR ')})`,
              fields: ['field'],
            });
            if (result?.data != null && result.total > 0) {
              return assistantResponse.error({
                statusCode: 409,
                body: `anonymization field: "${result.data.hits.hits
                  .map((c) => c._id)
                  .join(',')}" already exists`,
              });
            }
          }

          const writer = await dataClient?.getWriter();
          const changedAt = new Date().toISOString();
          const {
            errors,
            docs_created: docsCreated,
            docs_updated: docsUpdated,
            docs_deleted: docsDeleted,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          } = await writer!.bulk({
            documentsToCreate: body.create?.map((f) =>
              transformToCreateScheme(authenticatedUser, changedAt, f)
            ),
            documentsToDelete: body.delete?.ids,
            documentsToUpdate: body.update?.map((f) =>
              transformToUpdateScheme(authenticatedUser, changedAt, f)
            ),
            getUpdateScript: (document: UpdateAnonymizationFieldSchema) =>
              getUpdateScript({ anonymizationField: document, isPatch: true }),
          });
          const created =
            docsCreated.length > 0
              ? await dataClient?.findDocuments<EsAnonymizationFieldsSchema>({
                  page: 1,
                  perPage: 1000,
                  filter: docsCreated.map((c) => `_id:${c}`).join(' OR '),
                })
              : undefined;

          return buildBulkResponse(response, {
            updated: docsUpdated
              ? transformESToAnonymizationFields(docsUpdated as EsAnonymizationFieldsSchema[])
              : [],
            created: created?.data ? transformESSearchToAnonymizationFields(created?.data) : [],
            deleted: docsDeleted ?? [],
            errors,
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
