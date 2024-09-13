/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import {
  ExportRulesRequestBody,
  ExportRulesRequestQuery,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import type { ConfigType } from '../../../../../../config';
import { getNonPackagedRulesCount } from '../../../logic/search/get_existing_prepackaged_rules';
import { getExportByObjectIds } from '../../../logic/export/get_export_by_object_ids';
import { getExportAll } from '../../../logic/export/get_export_all';
import { buildSiemResponse } from '../../../../routes/utils';
import { RULE_MANAGEMENT_IMPORT_EXPORT_SOCKET_TIMEOUT_MS } from '../../timeouts';

export const exportRulesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: `${DETECTION_ENGINE_RULES_URL}/_export`,
      options: {
        tags: ['access:securitySolution'],
        timeout: {
          idleSocket: RULE_MANAGEMENT_IMPORT_EXPORT_SOCKET_TIMEOUT_MS,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: buildRouteValidationWithZod(ExportRulesRequestQuery),
            body: buildRouteValidationWithZod(ExportRulesRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const rulesClient = (await context.alerting).getRulesClient();
        const exceptionsClient = (await context.lists)?.getExceptionListClient();
        const actionsClient = (await context.actions)?.getActionsClient();

        const { getExporter, getClient } = (await context.core).savedObjects;

        const client = getClient({ includedHiddenTypes: ['action'] });
        const actionsExporter = getExporter(client);
        try {
          const exportSizeLimit = config.maxRuleImportExportSize;
          if (request.body?.objects != null && request.body.objects.length > exportSizeLimit) {
            return siemResponse.error({
              statusCode: 400,
              body: `Can't export more than ${exportSizeLimit} rules`,
            });
          } else {
            const nonPackagedRulesCount = await getNonPackagedRulesCount({
              rulesClient,
            });
            if (nonPackagedRulesCount > exportSizeLimit) {
              return siemResponse.error({
                statusCode: 400,
                body: `Can't export more than ${exportSizeLimit} rules`,
              });
            }
          }

          const exportedRulesAndReferences =
            request.body?.objects != null
              ? await getExportByObjectIds(
                  rulesClient,
                  exceptionsClient,
                  request.body.objects.map((obj) => obj.rule_id),
                  actionsExporter,
                  request,
                  actionsClient
                )
              : await getExportAll(
                  rulesClient,
                  exceptionsClient,
                  actionsExporter,
                  request,
                  actionsClient
                );

          const responseBody = request.query.exclude_export_details
            ? exportedRulesAndReferences.rulesNdjson
            : `${exportedRulesAndReferences.rulesNdjson}${exportedRulesAndReferences.exceptionLists}${exportedRulesAndReferences.actionConnectors}${exportedRulesAndReferences.exportDetails}`;

          return response.ok({
            headers: {
              'Content-Disposition': `attachment; filename="${request.query.file_name}"`,
              'Content-Type': 'application/ndjson',
            },
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
