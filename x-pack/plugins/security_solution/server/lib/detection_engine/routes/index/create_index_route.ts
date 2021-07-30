/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient } from 'src/core/server';
import {
  transformError,
  getIndexExists,
  getPolicyExists,
  setPolicy,
  createBootstrapIndex,
} from '@kbn/securitysolution-es-utils';
import type {
  AppClient,
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../../types';
import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import {
  createSignalsFieldAliases,
  getSignalsTemplate,
  getRbacRequiredFields,
  SIGNALS_TEMPLATE_VERSION,
} from './get_signals_template';
import { ensureMigrationCleanupPolicy } from '../../migrations/migration_cleanup';
import signalsPolicy from './signals_policy.json';
import { getTemplateVersion, templateNeedsUpdate } from './check_template_version';
import { getIndexVersion } from './get_index_version';
import { isOutdated } from '../../migrations/helpers';
import { RuleDataPluginService } from '../../../../../../rule_registry/server';
import signalExtraFields from './signal_extra_fields.json';

export const createIndexRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataService: RuleDataPluginService
) => {
  router.post(
    {
      path: DETECTION_ENGINE_INDEX_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const siemClient = context.securitySolution?.getAppClient();
        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        await createDetectionIndex(context, siemClient!, ruleDataService);
        return response.ok({ body: { acknowledged: true } });
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

class CreateIndexError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const createDetectionIndex = async (
  context: SecuritySolutionRequestHandlerContext,
  siemClient: AppClient,
  ruleDataService: RuleDataPluginService
): Promise<void> => {
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  const spaceId = siemClient.getSpaceId();

  if (!siemClient) {
    throw new CreateIndexError('', 404);
  }

  const index = siemClient.getSignalsIndex();
  await ensureMigrationCleanupPolicy({ alias: index, esClient });
  const policyExists = await getPolicyExists(esClient, index);
  if (!policyExists) {
    await setPolicy(esClient, index, signalsPolicy);
  }
  const templateVersion = await getTemplateVersion({ alias: index, esClient });
  if (await templateNeedsUpdate({ alias: index, esClient })) {
    const aadIndexAliasName = `${ruleDataService.getFullAssetName('security.alerts')}-${spaceId}`;
    await esClient.indices.putIndexTemplate({
      name: index,
      body: getSignalsTemplate(index, spaceId, aadIndexAliasName) as Record<string, unknown>,
    });
    // 45 is the last version that did not include alerts-as-data field and index aliases in the template
    // Update existing indices with these field and index aliases if upgrading from <= v45
    if (templateVersion <= 45) {
      await addAliasesToIndices({ esClient, index, aadIndexAliasName, spaceId });
      await esClient.indices.deleteTemplate({ name: index });
    }
  }
  const indexExists = await getIndexExists(esClient, index);
  if (indexExists) {
    const indexVersion = await getIndexVersion(esClient, index);
    if (isOutdated({ current: indexVersion, target: SIGNALS_TEMPLATE_VERSION })) {
      await esClient.indices.rollover({ alias: index });
    }
  } else {
    await createBootstrapIndex(esClient, index);
  }
};

const addAliasesToIndices = async ({
  esClient,
  index,
  aadIndexAliasName,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  index: string;
  aadIndexAliasName: string;
  spaceId: string;
}) => {
  await esClient.indices.putAlias({
    index: `${index}-*`,
    name: aadIndexAliasName,
    body: {
      is_write_index: false,
    },
  });

  // Make sure that all signal fields we add aliases for are guaranteed to exist in the mapping for ALL historical
  // signals indices (either by adding them to signalExtraFields or ensuring they exist in the original signals
  // mapping) or else this call will fail and not update ANY signals indices
  const fieldAliases = createSignalsFieldAliases();
  const newMapping = {
    properties: {
      ...signalExtraFields,
      ...fieldAliases,
      ...getRbacRequiredFields(spaceId),
    },
  };
  await esClient.indices.putMapping({
    index: `${index}-*`,
    body: newMapping,
    allow_no_indices: true,
  } as estypes.IndicesPutMappingRequest);
};
