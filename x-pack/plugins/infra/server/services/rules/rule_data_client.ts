/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger } from 'src/core/server';
import { mappingFromFieldMap } from '../../../../rule_registry/common/mapping_from_field_map';
import { experimentalRuleFieldMap } from '../../../../rule_registry/common/assets/field_maps/experimental_rule_field_map';

import { Dataset, RuleRegistryPluginSetupContract } from '../../../../rule_registry/server';
import type { InfraFeatureId } from '../../../common/constants';
import { RuleRegistrationContext, RulesServiceStartDeps } from './types';

export const createRuleDataClient = ({
  ownerFeatureId,
  registrationContext,
  getStartServices,
  logger,
  ruleDataService,
}: {
  ownerFeatureId: InfraFeatureId;
  registrationContext: RuleRegistrationContext;
  getStartServices: CoreSetup<RulesServiceStartDeps>['getStartServices'];
  logger: Logger;
  ruleDataService: RuleRegistryPluginSetupContract['ruleDataService'];
}) => {
  return ruleDataService.initializeIndex({
    feature: ownerFeatureId,
    registrationContext,
    dataset: Dataset.alerts,
    componentTemplateRefs: [],
    componentTemplates: [
      {
        name: 'mappings',
        mappings: mappingFromFieldMap(experimentalRuleFieldMap, 'strict'),
      },
    ],
  });
};
