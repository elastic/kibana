/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  CreateExternalRuleSourceRequestBody,
  CreateExternalRuleSourceResponse,
} from '../../../../../../common/api/detection_engine/external_rule_sources/create_external_rule_source/create_external_source.gen';
import { CREATE_EXTERNAL_RULE_SOURCE } from '../../../../../../common/api/detection_engine/external_rule_sources/urls';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { EXTERNAL_RULE_SOURCE_SO_TYPE } from '../../logic/rule_repositories_type';

export const createExternalRuleSource = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: CREATE_EXTERNAL_RULE_SOURCE,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateExternalRuleSourceRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<CreateExternalRuleSourceResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['core']);
          const savedObjectsClient = ctx.core.savedObjects.client;

          const { type, ...rest } = request.body;
          const result = await savedObjectsClient.create(EXTERNAL_RULE_SOURCE_SO_TYPE, {
            [type]: rest,
          });

          const responseBody = CreateExternalRuleSourceResponse.parse({
            id: result.id,
            type,
            ...result.attributes[type],
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
