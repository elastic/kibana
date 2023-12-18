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
  CONVERSATIONS_TABLE_MAX_PAGE_SIZE,
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
} from '../../../common/constants';

import { ElasticAssistantPluginRouter } from '../../types';
import { buildRouteValidationWithZod } from '../route_validation';
import { buildResponse } from '../utils';
import {
  BulkActionSkipResult,
  BulkCrudActionResponse,
  BulkCrudActionResults,
  BulkCrudActionSummary,
  PerformBulkActionRequestBody,
  PerformBulkActionResponse,
} from '../../schemas/conversations/bulk_crud_conversations_route.gen';
import { ConversationResponse } from '../../schemas/conversations/common_attributes.gen';

export interface BulkOperationError {
  message: string;
  status?: number;
  conversation: {
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
    errors?: BulkActionError[];
    updated?: ConversationResponse[];
    created?: ConversationResponse[];
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
    conversations_count: summary.total,
    attributes: { results, summary },
  };

  return response.ok({ body: responseBody });
};

export const bulkActionConversationsRoute = (
  router: ElasticAssistantPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
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
        const siemResponse = buildResponse(response);

        if (body?.update && body.update?.length > CONVERSATIONS_TABLE_MAX_PAGE_SIZE) {
          return siemResponse.error({
            body: `More than ${CONVERSATIONS_TABLE_MAX_PAGE_SIZE} ids sent for bulk edit action.`,
            statusCode: 400,
          });
        }

        const abortController = new AbortController();

        // subscribing to completed$, because it handles both cases when request was completed and aborted.
        // when route is finished by timeout, aborted$ is not getting fired
        request.events.completed$.subscribe(() => abortController.abort());
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant']);
          const dataClient = await ctx.elasticAssistant.getAIAssistantDataClient();

          const writer = await dataClient?.getWriter();

          const {
            errors,
            docs_created: docsCreated,
            docs_updated: docsUpdated,
            docs_deleted: docsDeleted,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          } = await writer!.bulk({
            conversationsToCreate: body.create,
            conversationsToDelete: body.delete?.ids,
            conversationsToUpdate: body.update,
          });

          const created = await dataClient?.findConversations({
            page: 1,
            perPage: 1000,
            filter: docsCreated.map((updatedId) => `id:${updatedId}`).join(' OR '),
            fields: ['id'],
          });
          const updated = await dataClient?.findConversations({
            page: 1,
            perPage: 1000,
            filter: docsUpdated.map((updatedId) => `id:${updatedId}`).join(' OR '),
            fields: ['id'],
          });

          return buildBulkResponse(response, {
            updated: updated?.data,
            created: created?.data,
            deleted: docsDeleted ?? [],
            errors,
          });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
