/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger } from '@kbn/core/server';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import {
  ExportRulesRequestBody,
  ExportRulesRequestQuery,
} from '../../../../../../../common/api/detection_engine/rule_management';

import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import type { ConfigType } from '../../../../../../config';
import { getNonPackagedRulesCount } from '../../../logic/search/get_existing_prepackaged_rules';
import { getExportByObjectIds } from '../../../logic/export/get_export_by_object_ids';
import { getExportAll } from '../../../logic/export/get_export_all';
import { buildSiemResponse } from '../../../../routes/utils';

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
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: buildRouteValidation(ExportRulesRequestQuery),
            body: buildRouteValidation(ExportRulesRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const rulesClient = (await context.alerting).getRulesClient();
        const exceptionsClient = (await context.lists)?.getExceptionListClient();
        const actionsClient = (await context.actions)?.getActionsClient();

        const {
          getExporter,
          getClient,
          client: savedObjectsClient,
        } = (await context.core).savedObjects;

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
                  savedObjectsClient,
                  request.body.objects,
                  logger,
                  actionsExporter,
                  request,
                  actionsClient
                )
              : await getExportAll(
                  rulesClient,
                  exceptionsClient,
                  savedObjectsClient,
                  logger,
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
