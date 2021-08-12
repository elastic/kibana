/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { once } from 'lodash';
import { IRuleDataClient, RuleRegistryPluginSetupContract } from '../../../../rule_registry/server';
import { mappingFromFieldMap } from '../../../../rule_registry/common/mapping_from_field_map';
import { TECHNICAL_COMPONENT_TEMPLATE_NAME } from '../../../../rule_registry/common/assets';
import {
  DATAFEED_ID,
  DATAFEED_STATE,
  JOB_ID,
  JOB_STATE,
  MEMORY_STATUS,
  MEMORY_LOG_TIME,
  MODEL_BYTES,
  MODEL_BYTES_MEMORY_LIMIT,
  PEAK_MODEL_BYTES,
  MODEL_BYTES_EXCEEDED,
  ANNOTATION,
  MISSED_DOC_COUNT,
  END_TIMESTAMP,
} from '../../../common/constants/alerts';

export function getRuleDataClient(
  ruleRegistry: RuleRegistryPluginSetupContract,
  logger: Logger
): IRuleDataClient {
  const { ruleDataService } = ruleRegistry;

  const alertsIndexPattern = ruleDataService.getFullAssetName('ml*');

  const initializeRuleDataTemplates = once(async () => {
    const componentTemplateName = ruleDataService.getFullAssetName('ml-mappings');

    if (!ruleDataService.isWriteEnabled()) {
      return;
    }

    await ruleDataService.createOrUpdateComponentTemplate({
      name: componentTemplateName,
      body: {
        template: {
          settings: {
            number_of_shards: 1,
          },
          // Mappings based on {@link AnomalyDetectionJobHealthResult}
          mappings: mappingFromFieldMap(
            {
              [JOB_ID]: {
                type: 'keyword',
              },
              [JOB_STATE]: {
                type: 'keyword',
              },
              // datafeed
              [DATAFEED_ID]: {
                type: 'keyword',
              },
              [DATAFEED_STATE]: {
                type: 'keyword',
              },
              // mml
              [MEMORY_STATUS]: {
                type: 'keyword',
              },
              [MEMORY_LOG_TIME]: {
                type: 'date',
              },
              [MODEL_BYTES]: {
                type: 'long',
              },
              [MODEL_BYTES_MEMORY_LIMIT]: {
                type: 'long',
              },
              [PEAK_MODEL_BYTES]: {
                type: 'long',
              },
              [MODEL_BYTES_EXCEEDED]: {
                type: 'long',
              },
              // {@link DelayedDataResponse)
              [ANNOTATION]: {
                type: 'text',
              },
              [MISSED_DOC_COUNT]: {
                type: 'long',
              },
              [END_TIMESTAMP]: {
                type: 'date',
              },
            },
            'strict'
          ),
        },
      },
    });

    await ruleDataService.createOrUpdateIndexTemplate({
      name: ruleDataService.getFullAssetName('ml-index-template'),
      body: {
        index_patterns: [alertsIndexPattern],
        composed_of: [
          ruleDataService.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
          componentTemplateName,
        ],
      },
    });
    await ruleDataService.updateIndexMappingsMatchingPattern(alertsIndexPattern);
  });

  const initializeRuleDataTemplatesPromise = initializeRuleDataTemplates().catch((err) => {
    logger!.error(err);
  });

  const ruleDataClient = ruleDataService.getRuleDataClient(
    'ml',
    ruleDataService.getFullAssetName('ml'),
    () => initializeRuleDataTemplatesPromise
  );

  return ruleDataClient;
}
