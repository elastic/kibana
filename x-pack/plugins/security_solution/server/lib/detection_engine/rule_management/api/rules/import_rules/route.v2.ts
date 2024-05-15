/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ImportRulesV2Response } from '../../../../../../../common/api/detection_engine/rule_management';
import {
  ImportRulesV2RequestBody,
  ImportRulesV2RequestQuery,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { ConfigType } from '../../../../../../config';
import type { SetupPlugins } from '../../../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidationWithZod } from '../../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../../routes/utils';
import { RULE_MANAGEMENT_IMPORT_EXPORT_SOCKET_TIMEOUT_MS } from '../../timeouts';

export const importRulesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  ml: SetupPlugins['ml']
) => {
  router.versioned
    .post({
      access: 'public',
      path: `${DETECTION_ENGINE_RULES_URL}/_import`,
      options: {
        tags: ['access:securitySolution'],
        body: {
          maxBytes: config.maxRuleImportPayloadBytes,
          output: 'stream',
        },
        timeout: {
          idleSocket: RULE_MANAGEMENT_IMPORT_EXPORT_SOCKET_TIMEOUT_MS,
        },
      },
    })
    .addVersion(
      {
        version: '2024-05-15',
        validate: {
          request: {
            query: buildRouteValidationWithZod(ImportRulesV2RequestQuery),
            body: buildRouteValidationWithZod(ImportRulesV2RequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ImportRulesV2Response>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          // const ctx = await context.resolve([
          //   'core',
          //   'securitySolution',
          //   'alerting',
          //   'actions',
          //   'lists',
          //   'licensing',
          // ]);

          // const rulesToImport = request.body;

          // Implementation is omitted since it doesn't bring too much value to demonstration purpose

          return response.ok({
            body: {
              success: true,
              imported_rules_count: 10,
              errors: [],
            },
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
