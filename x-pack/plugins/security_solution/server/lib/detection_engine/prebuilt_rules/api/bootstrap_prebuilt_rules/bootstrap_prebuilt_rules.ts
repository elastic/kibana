/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import execa from 'execa';
import path from 'path';
import { BOOTSTRAP_PREBUILT_RULES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { BootstrapPrebuiltRulesResponse } from '../../../../../../common/api/detection_engine/prebuilt_rules/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import {
  installEndpointPackage,
  installPrebuiltRulesPackage,
} from '../install_prebuilt_rules_and_timelines/install_prebuilt_rules_package';

export const bootstrapPrebuiltRulesRoute = (router: SecuritySolutionPluginRouter) => {
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
          const ctx = await context.resolve(['securitySolution']);
          const securityContext = ctx.securitySolution;
          const config = securityContext.getConfig();

          const results = await Promise.all([
            installPrebuiltRulesPackage(config, securityContext),
            installEndpointPackage(config, securityContext),
          ]);

          if (config.prebuiltRuleRepositories) {
            // Ensure the repositories directory exists
            await execa('mkdir', ['-p', path.join(__dirname, './repositories')]);

            await Promise.all(
              config.prebuiltRuleRepositories.map(async (repository) => {
                try {
                  // Clone and update prebuilt rule repositories
                  await execa('git', [
                    'clone',
                    '--depth',
                    '1',
                    `https://${repository.username}:${repository.token}@github.com//${repository.username}/${repository.repository}.git`,
                    path.join(__dirname, `./repositories/${repository.repository}`),
                  ]);
                } catch (err) {
                  // Ignore error if the repository already exists
                  if (err.exitCode !== 128) {
                    throw err;
                  }
                  // Update the repository
                  await execa('git', ['pull'], {
                    cwd: path.join(__dirname, `./repositories/${repository.repository}`),
                  });
                }
              })
            );
          }

          const responseBody: BootstrapPrebuiltRulesResponse = {
            packages: results.map((result) => ({
              name: result.package.name,
              version: result.package.version,
              status: result.status,
            })),
          };

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
