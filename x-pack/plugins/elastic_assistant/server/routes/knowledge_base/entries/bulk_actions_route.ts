/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { AuthenticatedUser, IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BULK_ACTION,
  PerformKnowledgeBaseEntryBulkActionRequestBody,
  API_VERSIONS,
  KnowledgeBaseEntryBulkCrudActionResults,
  KnowledgeBaseEntryBulkCrudActionResponse,
  KnowledgeBaseEntryBulkCrudActionSummary,
  PerformKnowledgeBaseEntryBulkActionResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';

import { performChecks } from '../../helpers';
import { KNOWLEDGE_BASE_ENTRIES_TABLE_MAX_PAGE_SIZE } from '../../../../common/constants';
import { EsKnowledgeBaseEntrySchema } from '../../../ai_assistant_data_clients/knowledge_base/types';
import { ElasticAssistantPluginRouter } from '../../../types';
import { buildResponse } from '../../utils';
import { transformESSearchToKnowledgeBaseEntry } from '../../../ai_assistant_data_clients/knowledge_base/transforms';
import { transformToCreateSchema } from '../../../ai_assistant_data_clients/knowledge_base/create_knowledge_base_entry';

export interface BulkOperationError {
  message: string;
  status?: number;
  document: {
    id: string;
    name?: string;
  };
}

export type BulkResponse = KnowledgeBaseEntryBulkCrudActionResults & {
  errors?: BulkOperationError[];
};

export type BulkActionError = BulkOperationError | unknown;

const buildBulkResponse = (
  response: KibanaResponseFactory,
  {
    errors = [],
    updated = [],
    created = [],
    deleted = [],
    skipped = [],
  }: KnowledgeBaseEntryBulkCrudActionResults & { errors: BulkOperationError[] }
): IKibanaResponse<KnowledgeBaseEntryBulkCrudActionResponse> => {
  const numSucceeded = updated.length + created.length + deleted.length;
  const numSkipped = skipped.length;
  const numFailed = errors.length;

  const summary: KnowledgeBaseEntryBulkCrudActionSummary = {
    failed: numFailed,
    succeeded: numSucceeded,
    skipped: numSkipped,
    total: numSucceeded + numFailed + numSkipped,
  };

  const results: KnowledgeBaseEntryBulkCrudActionResults = {
    updated,
    created,
    deleted,
    skipped,
  };

  if (numFailed > 0) {
    return response.custom<KnowledgeBaseEntryBulkCrudActionResponse>({
      headers: { 'content-type': 'application/json' },
      body: {
        message: summary.succeeded > 0 ? 'Bulk edit partially failed' : 'Bulk edit failed',
        attributes: {
          errors: errors.map((e: BulkOperationError) => ({
            statusCode: e.status ?? 500,
            knowledgeBaseEntries: [{ id: e.document.id, name: '' }],
            message: e.message,
          })),
          results,
          summary,
        },
      },
      statusCode: 500,
    });
  }

  const responseBody: KnowledgeBaseEntryBulkCrudActionResponse = {
    success: true,
    knowledgeBaseEntriesCount: summary.total,
    attributes: { results, summary },
  };

  return response.ok({ body: responseBody });
};

export const bulkActionKnowledgeBaseEntriesRoute = (router: ElasticAssistantPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: ELASTIC_AI_ASSISTANT_KNOWLEDGE_BASE_ENTRIES_URL_BULK_ACTION,
      options: {
        tags: ['access:elasticAssistant'],
        timeout: {
          idleSocket: moment.duration(15, 'minutes').asMilliseconds(),
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PerformKnowledgeBaseEntryBulkActionRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PerformKnowledgeBaseEntryBulkActionResponse>> => {
        const assistantResponse = buildResponse(response);
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          const logger = ctx.elasticAssistant.logger;

          // Perform license, authenticated user and FF checks
          const checkResponse = performChecks({
            authenticatedUser: true,
            capability: 'assistantKnowledgeBaseByDefault',
            context: ctx,
            license: true,
            request,
            response,
          });
          if (checkResponse) {
            return checkResponse;
          }

          logger.debug(
            () =>
              `Performing bulk action on Knowledge Base Entries:\n${JSON.stringify(request.body)}`
          );

          const { body } = request;

          const operationsCount =
            (body?.update ? body.update?.length : 0) +
            (body?.create ? body.create?.length : 0) +
            (body?.delete ? body.delete?.ids?.length ?? 0 : 0);
          if (operationsCount > KNOWLEDGE_BASE_ENTRIES_TABLE_MAX_PAGE_SIZE) {
            return assistantResponse.error({
              body: `More than ${KNOWLEDGE_BASE_ENTRIES_TABLE_MAX_PAGE_SIZE} ids sent for bulk edit action.`,
              statusCode: 400,
            });
          }

          const abortController = new AbortController();

          // subscribing to completed$, because it handles both cases when request was completed and aborted.
          // when route is finished by timeout, aborted$ is not getting fired
          request.events.completed$.subscribe(() => abortController.abort());
          const kbDataClient = await ctx.elasticAssistant.getAIAssistantKnowledgeBaseDataClient({
            v2KnowledgeBaseEnabled: true,
          });
          const spaceId = ctx.elasticAssistant.getSpaceId();
          // Authenticated user null check completed in `performChecks()` above
          const authenticatedUser = ctx.elasticAssistant.getCurrentUser() as AuthenticatedUser;

          if (body.create && body.create.length > 0) {
            const result = await kbDataClient?.findDocuments<EsKnowledgeBaseEntrySchema>({
              perPage: 100,
              page: 1,
              filter: `users:{ id: "${authenticatedUser?.profile_uid}" }`,
              fields: [],
            });
            if (result?.data != null && result.total > 0) {
              return assistantResponse.error({
                statusCode: 409,
                body: `Knowledge Base Entry id's: "${transformESSearchToKnowledgeBaseEntry(
                  result.data
                )
                  .map((c) => c.id)
                  .join(',')}" already exists`,
              });
            }
          }

          const writer = await kbDataClient?.getWriter();
          const changedAt = new Date().toISOString();
          const {
            errors,
            docs_created: docsCreated,
            docs_updated: docsUpdated,
            docs_deleted: docsDeleted,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          } = await writer!.bulk({
            documentsToCreate: body.create?.map((entry) =>
              transformToCreateSchema({
                createdAt: changedAt,
                spaceId,
                user: authenticatedUser,
                entry,
              })
            ),
            documentsToDelete: body.delete?.ids,
            documentsToUpdate: [], // TODO: Support bulk update
            authenticatedUser,
          });
          const created =
            docsCreated.length > 0
              ? await kbDataClient?.findDocuments<EsKnowledgeBaseEntrySchema>({
                  page: 1,
                  perPage: 100,
                  filter: docsCreated.map((c) => `_id:${c}`).join(' OR '),
                })
              : undefined;

          return buildBulkResponse(response, {
            // @ts-ignore-next-line TS2322
            updated: docsUpdated,
            created: created?.data ? transformESSearchToKnowledgeBaseEntry(created?.data) : [],
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
