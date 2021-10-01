/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  exportRulesQuerySchema,
  ExportRulesQuerySchemaDecoded,
  exportRulesSchema,
  ExportRulesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/export_rules_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { ConfigType } from '../../../../config';
import { getNonPackagedRulesCount } from '../../rules/get_existing_prepackaged_rules';
import { getExportByObjectIds } from '../../rules/get_export_by_object_ids';
import { getExportAll } from '../../rules/get_export_all';
import { buildSiemResponse } from '../utils';

export const exportRulesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  isRuleRegistryEnabled: boolean
) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_export`,
      validate: {
        query: buildRouteValidation<typeof exportRulesQuerySchema, ExportRulesQuerySchemaDecoded>(
          exportRulesQuerySchema
        ),
        body: buildRouteValidation<typeof exportRulesSchema, ExportRulesSchemaDecoded>(
          exportRulesSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const rulesClient = context.alerting?.getRulesClient();

      if (!rulesClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      try {
        const exportSizeLimit = config.maxRuleImportExportSize;
        if (request.body?.objects != null && request.body.objects.length > exportSizeLimit) {
          return siemResponse.error({
            statusCode: 400,
            body: `Can't export more than ${exportSizeLimit} rules`,
          });
        } else {
          const nonPackagedRulesCount = await getNonPackagedRulesCount({
            isRuleRegistryEnabled,
            rulesClient,
          });
          if (nonPackagedRulesCount > exportSizeLimit) {
            return siemResponse.error({
              statusCode: 400,
              body: `Can't export more than ${exportSizeLimit} rules`,
            });
          }
        }

        const exported =
          request.body?.objects != null
            ? await getExportByObjectIds(rulesClient, request.body.objects, isRuleRegistryEnabled)
            : await getExportAll(rulesClient, isRuleRegistryEnabled);

        const responseBody = request.query.exclude_export_details
          ? exported.rulesNdjson
          : `${exported.rulesNdjson}${exported.exportDetails}`;

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
