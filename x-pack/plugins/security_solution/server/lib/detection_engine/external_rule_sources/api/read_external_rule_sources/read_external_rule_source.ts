/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import type { ExternalRuleSourceSOAttributes } from '../../logic/rule_repositories_type';
import { EXTERNAL_RULE_SOURCE_SO_TYPE } from '../../logic/rule_repositories_type';
import { READ_EXTERNAL_RULE_SOURCES } from '../../../../../../common/api/detection_engine/external_rule_sources/urls';
import {
  ReadExternalRuleSourceRequestBody,
  ReadExternalRuleSourceResponse,
} from '../../../../../../common/api/detection_engine/external_rule_sources/read_external_rule_sources/read_external_rule_source.gen';

export const readExternalRuleSource = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: READ_EXTERNAL_RULE_SOURCES,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(ReadExternalRuleSourceRequestBody),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<ReadExternalRuleSourceResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['core']);
          const savedObjectsClient = ctx.core.savedObjects.client;

          const { page, perPage } = request.body;
          const result = await savedObjectsClient.find<ExternalRuleSourceSOAttributes>({
            type: EXTERNAL_RULE_SOURCE_SO_TYPE,
            page,
            perPage,
          });

          const responseBody = ReadExternalRuleSourceResponse.parse({
            results: result.saved_objects.map((obj) => {
              const type = Object.keys(obj.attributes)[0];
              return {
                id: obj.id,
                type,
                ...obj.attributes[type],
              };
            }),
            total: result.total,
            page,
            perPage,
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
