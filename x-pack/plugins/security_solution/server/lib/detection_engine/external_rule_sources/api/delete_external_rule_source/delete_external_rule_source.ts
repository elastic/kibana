/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { DELETE_EXTERNAL_RULE_SOURCE } from '../../../../../../common/api/detection_engine/external_rule_sources/urls';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import type { ExternalRuleSourceSOAttributes } from '../../logic/rule_repositories_type';
import { EXTERNAL_RULE_SOURCE_SO_TYPE } from '../../logic/rule_repositories_type';
import {
  DeleteExternalRuleSourceRequestBody,
  DeleteExternalRuleSourceResponse,
} from '../../../../../../common/api/detection_engine/external_rule_sources/delete_external_rule_source/delete_external_rule_source.gen';

export const deleteExternalRuleSource = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: DELETE_EXTERNAL_RULE_SOURCE,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(DeleteExternalRuleSourceRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<DeleteExternalRuleSourceResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['core']);
          const savedObjectsClient = ctx.core.savedObjects.client;

          const { id } = request.body;
          const ruleSource = await savedObjectsClient.get<ExternalRuleSourceSOAttributes>(
            EXTERNAL_RULE_SOURCE_SO_TYPE,
            id
          );

          const type = Object.keys(
            ruleSource.attributes
          )[0] as keyof ExternalRuleSourceSOAttributes;
          const responseBody = DeleteExternalRuleSourceResponse.parse({
            id: ruleSource.id,
            type,
            ...ruleSource.attributes[type],
          });

          await savedObjectsClient.delete(EXTERNAL_RULE_SOURCE_SO_TYPE, id, {
            refresh: 'wait_for',
          });

          return response.ok({
            body: responseBody,
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
