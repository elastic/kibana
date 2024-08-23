/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IKibanaResponse,
  ISavedObjectsImporter,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { BOOTSTRAP_PREBUILT_RULES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { BootstrapPrebuiltRulesResponse } from '../../../../../../common/api/detection_engine/prebuilt_rules/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules.gen';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildSiemResponse } from '../../../routes/utils';
import { installEndpointPackage } from '../install_prebuilt_rules_and_timelines/install_prebuilt_rules_package';
import { installExternalPrebuiltRuleAssets } from '../../logic/rule_assets/install_rule_assets';
import type { IDetectionRulesClient } from '../../../rule_management/logic/detection_rules_client/detection_rules_client_interface';
import type { IPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import { createPrebuiltRuleObjectsClient } from '../../logic/rule_objects/prebuilt_rule_objects_client';
import type { ExternalRuleSourceClient } from '../../../external_rule_sources/logic/external_rule_sources_client';
import { createExternalRuleSourcesClient } from '../../../external_rule_sources/logic/external_rule_sources_client';
import type { ExternalRuleSourceOutput } from '../../../../../../common/api/detection_engine/external_rule_sources/model/external_rule_source.gen';

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
          const ctx = await context.resolve(['securitySolution', 'core', 'alerting']);
          const savedObjectsClient = ctx.core.savedObjects.client;
          const savedObjectsImporter = ctx.core.savedObjects.getImporter(savedObjectsClient);
          const securityContext = ctx.securitySolution;
          const rulesClient = ctx.alerting.getRulesClient();
          const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
          const detectionRulesClient = securityContext.getDetectionRulesClient();
          const externalRuleSourcesClient = createExternalRuleSourcesClient({
            savedObjectsClient,
          });
          const config = securityContext.getConfig();

          const results = await Promise.all([
            // installPrebuiltRulesPackage(config, securityContext),
            installEndpointPackage(config, securityContext),
          ]);

          const { updated, errors } = await getExternalPrebuiltRuleAssets(
            externalRuleSourcesClient,
            savedObjectsClient,
            savedObjectsImporter,
            detectionRulesClient,
            ruleObjectsClient,
            logger
          );

          const responseBody: BootstrapPrebuiltRulesResponse = {
            packages: results.map((result) => ({
              name: result.package.name,
              version: result.package.version,
              status: result.status,
            })),
            repositories: {
              updated,
              errors,
            },
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

const getExternalPrebuiltRuleAssets = async (
  externalRuleSourceClient: ExternalRuleSourceClient,
  savedObjectsClient: SavedObjectsClientContract,
  savedObjectsImporter: ISavedObjectsImporter,
  detectionRulesClient: IDetectionRulesClient,
  ruleObjectsClient: IPrebuiltRuleObjectsClient,
  logger: Logger
) => {
  const prebuiltRuleRepositories = await externalRuleSourceClient.findExternalRuleSources({
    type: 'github',
    page: 1,
    perPage: 10000,
  });
  const externalPrebuiltRuleBlobs = await fetchPrebuiltRuleFilenames(
    prebuiltRuleRepositories.results,
    externalRuleSourceClient
  );
  const installResult = await installExternalPrebuiltRuleAssets({
    externalPrebuiltRuleBlobs,
    savedObjectsClient,
    savedObjectsImporter,
    detectionRulesClient,
    ruleObjectsClient,
    logger,
    externalRuleSourceClient,
  });

  return installResult;
};

export interface ExternalRuleAssetBlob {
  filename: string;
  sha?: string;
  repository: ExternalRuleSourceOutput;
}

async function fetchPrebuiltRuleFilenames(
  prebuiltRuleRepositories: ExternalRuleSourceOutput[],
  externalRuleSourceClient: ExternalRuleSourceClient
): Promise<ExternalRuleAssetBlob[]> {
  const allRules: ExternalRuleAssetBlob[] = [];

  for (const repository of prebuiltRuleRepositories) {
    const octokit = await externalRuleSourceClient.getAuthenticatedGithubClient(repository.id);
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
      owner: repository.owner,
      repo: repository.repo,
      tree_sha: 'main',
      recursive: 'true',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    const files = data.tree
      .filter((item) => item.type === 'blob')
      .filter((item) => item.path && item.path.endsWith('.json'))
      .map((item) => ({
        filename: item.path?.replace('.json', '') ?? '',
        sha: item.sha,
        repository,
      }));

    allRules.push(...files);
  }

  return allRules;
}
