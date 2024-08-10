/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { type IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import {
  EntityResolutionCandidatesPostRequestBody,
  EntityResolutionCandidatesPostResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ENTITY_RESOLUTION_CANDIDATES } from '../../../common/constants';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';
import { MatchEntity } from '../../ai_assistant_data_clients/entity_resolution';

// TODO: this is duplicated code
interface CandidateEntity {
  id: string;
  type: string;
  name: string;
  email?: string;
}

const matchEntityToCandidateEntity = (match: MatchEntity): CandidateEntity => {
  if (match.type === 'user') {
    return {
      id: match._id,
      type: match.type,
      name: match._source.user.name,
      email: match._source.user.email,
    };
  }

  return {
    id: match._id,
    type: match.type,
    name: match._source.host.name,
  };
};

export const postEntityResolutionCandidatesRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_RESOLUTION_CANDIDATES,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        validate: {
          request: {
            body: buildRouteValidationWithZod(EntityResolutionCandidatesPostRequestBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(EntityResolutionCandidatesPostResponse) },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<EntityResolutionCandidatesPostResponse>> => {
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        try {
          const entitiesIndexPattern = decodeURIComponent(request.body.entitiesIndexPattern);
          const { size, entity: searchEntity } = request.body;

          const entityResolutionClient = await assistantContext.getEntityResolutionDataClient();

          if (!entityResolutionClient) {
            return resp.error({
              body: `Entity resolution tool failed to generate`,
              statusCode: 500,
            });
          }

          if (!searchEntity) {
            return resp.error({
              body: `no search entity`,
              statusCode: 500,
            });
          }

          const { candidates } = await entityResolutionClient.findMatches({
            searchEntity,
            entitiesIndexPattern,
            size,
          });

          const formattedCandidates = candidates.map((candidate) => ({
            index: candidate._index,
            id: candidate._id,
            document: candidate._source,
            entity: matchEntityToCandidateEntity(candidate),
          }));

          return response.ok({
            body: {
              candidates: formattedCandidates,
              entity: searchEntity,
            },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
