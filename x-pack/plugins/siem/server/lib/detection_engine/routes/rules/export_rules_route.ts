/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { ConfigType } from '../../../../config';
import { ExportRulesRequestParams } from '../../rules/types';
import { getNonPackagedRulesCount } from '../../rules/get_existing_prepackaged_rules';
import { exportRulesSchema, exportRulesQuerySchema } from '../schemas/export_rules_schema';
import { getExportByObjectIds } from '../../rules/get_export_by_object_ids';
import { getExportAll } from '../../rules/get_export_all';
import { transformError, buildRouteValidation, buildSiemResponse } from '../utils';

export const exportRulesRoute = (router: IRouter, config: ConfigType) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_export`,
      validate: {
        query: buildRouteValidation<ExportRulesRequestParams['query']>(exportRulesQuerySchema),
        body: buildRouteValidation<ExportRulesRequestParams['body']>(exportRulesSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const alertsClient = context.alerting?.getAlertsClient();

      if (!alertsClient) {
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
          const nonPackagedRulesCount = await getNonPackagedRulesCount({ alertsClient });
          if (nonPackagedRulesCount > exportSizeLimit) {
            return siemResponse.error({
              statusCode: 400,
              body: `Can't export more than ${exportSizeLimit} rules`,
            });
          }
        }

        const exported =
          request.body?.objects != null
            ? await getExportByObjectIds(alertsClient, request.body.objects)
            : await getExportAll(alertsClient);

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
