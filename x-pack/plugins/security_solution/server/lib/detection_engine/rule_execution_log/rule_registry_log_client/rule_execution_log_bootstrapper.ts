/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TECHNICAL_COMPONENT_TEMPLATE_NAME } from '../../../../../../rule_registry/common/assets';
import { mappingFromFieldMap } from '../../../../../../rule_registry/common/mapping_from_field_map';
import { IRuleDataPluginService } from '../types';
import { ruleExecutionFieldMap } from './rule_execution_field_map';

/**
 * @deprecated bootstrapRuleExecutionLog is kept here only as a reference. It will be superseded with EventLog implementation
 */
export const bootstrapRuleExecutionLog = async (
  ruleDataService: IRuleDataPluginService,
  indexAlias: string
) => {
  const indexPattern = `${indexAlias}*`;
  const componentTemplateName = `${indexAlias}-mappings`;
  const indexTemplateName = `${indexAlias}-template`;

  await ruleDataService.createOrUpdateComponentTemplate({
    name: componentTemplateName,
    body: {
      template: {
        settings: {
          number_of_shards: 1,
        },
        mappings: mappingFromFieldMap(ruleExecutionFieldMap, 'strict'),
      },
    },
  });

  await ruleDataService.createOrUpdateIndexTemplate({
    name: indexTemplateName,
    body: {
      index_patterns: [indexPattern],
      composed_of: [
        ruleDataService.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
        componentTemplateName,
      ],
    },
  });

  await ruleDataService.updateIndexMappingsMatchingPattern(indexPattern);
};
