/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { BOOTSTRAP_PREBUILT_RULES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { BootstrapPrebuiltRulesResponse } from '../../../../../../common/api/detection_engine/prebuilt_rules/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import {
  installEndpointPackage,
  installPrebuiltRulesPackage,
} from '../install_prebuilt_rules_and_timelines/install_prebuilt_rules_package';
import { installLocalPrebuiltRuleAssets } from '../../logic/rule_assets/install_local_prebuilt_rule_assets';

export const bootstrapPrebuiltRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'internal',
      path: BOOTSTRAP_PREBUILT_RULES_URL,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      async (context, _, response): Promise<IKibanaResponse<BootstrapPrebuiltRulesResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['securitySolution', 'core']);
          const savedObjectsClient = ctx.core.savedObjects.client;
          const savedObjectsImporter = ctx.core.savedObjects.getImporter(savedObjectsClient);
          const securityContext = ctx.securitySolution;
          const config = securityContext.getConfig();

          const results = await Promise.all([
            installPrebuiltRulesPackage(config, securityContext),
            installEndpointPackage(config, securityContext),
          ]);

          const result = await installLocalPrebuiltRuleAssets(
            savedObjectsClient,
            savedObjectsImporter,
            logger
          );

          // const responseBody: BootstrapPrebuiltRulesResponse = {
          //   packages: results.map((result) => ({
          //     name: result.package.name,
          //     version: result.package.version,
          //     status: result.status,
          //   })),
          // };

          return response.ok({
            body: result,
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
