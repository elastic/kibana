/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
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
  SIGNALS_FIELD_ALIASES_VERSION,
  ALIAS_VERSION_FIELD,
} from './get_signals_template';
import { ensureMigrationCleanupPolicy } from '../../migrations/migration_cleanup';
import signalsPolicy from './signals_policy.json';
import { templateNeedsUpdate } from './check_template_version';
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
  const aadIndexAliasName = `${ruleDataService.getFullAssetName('security.alerts')}-${spaceId}`;
  if (await templateNeedsUpdate({ alias: index, esClient })) {
    await esClient.indices.putIndexTemplate({
      name: index,
      body: getSignalsTemplate(index, spaceId, aadIndexAliasName) as Record<string, unknown>,
    });
  }
  // Check if the old legacy siem signals template exists and remove it
  try {
    await esClient.indices.deleteTemplate({ name: index });
  } catch (err) {
    if (err.statusCode !== 404) {
      throw err;
    }
  }
  await addFieldAliasesToIndices({ esClient, index, spaceId });
  // The internal user is used here because Elasticsearch requires the PUT alias requestor to have 'manage' permissions
  // for BOTH the index AND alias name. However, through 7.14 admins only needed permissions for .siem-signals (the index)
  // and not .alerts-security.alerts (the alias). From the security solution perspective, a user that has manage permissions
  // for .siem-signals should be allowed to add this alias. If the call to addFieldAliasesToIndices above succeeds, then
  // we assume they are allowed to add this alias.
  await context.core.elasticsearch.client.asInternalUser.indices.putAlias({
    index: `${index}-*`,
    name: aadIndexAliasName,
    body: {
      is_write_index: false,
    },
  });
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

const addFieldAliasesToIndices = async ({
  esClient,
  index,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  index: string;
  spaceId: string;
}) => {
  const { body: indexMappings } = await esClient.indices.get({ index });
  // Make sure that all signal fields we add aliases for are guaranteed to exist in the mapping for ALL historical
  // signals indices (either by adding them to signalExtraFields or ensuring they exist in the original signals
  // mapping) or else this call will fail and not update ANY signals indices
  const fieldAliases = createSignalsFieldAliases();
  for (const [indexName, mapping] of Object.entries(indexMappings)) {
    const currentVersion: number | undefined = get(mapping.mappings?._meta, 'version');
    const newMapping = {
      properties: {
        ...signalExtraFields,
        ...fieldAliases,
        ...getRbacRequiredFields(spaceId),
      },
      _meta: {
        version: currentVersion,
        [ALIAS_VERSION_FIELD]: SIGNALS_FIELD_ALIASES_VERSION,
      },
    };
    await esClient.indices.putMapping({
      index: indexName,
      body: newMapping,
      allow_no_indices: true,
    } as estypes.IndicesPutMappingRequest);
  }
};
