/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import { Dataset, RuleRegistryPluginSetupContract } from '../../../../rule_registry/server';
import type { InfraFeatureId } from '../../../common/constants';
import { RuleRegistrationContext } from './types';

export const createRuleDataClient = ({
  ownerFeatureId,
  registrationContext,
  logger,
  ruleDataService,
}: {
  ownerFeatureId: InfraFeatureId;
  registrationContext: RuleRegistrationContext;
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
        mappings: {},
      },
    ],
  });
};
