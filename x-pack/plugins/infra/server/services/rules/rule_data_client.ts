/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger } from 'src/core/server';
// import {
//   ALERT_EVALUATION_THRESHOLD,
//   ALERT_EVALUATION_VALUE,
// } from '../../../../observability/common/technical_field_names';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
} from '../../lib/alerting/common/technical_rule_data_field_names';
// import { ALERT_NAMESPACE } from '@kbn/rule-data-utils/technical_field_names';
import { mappingFromFieldMap } from '../../../../rule_registry/common/mapping_from_field_map';
// const ALERT_EVALUATION_THRESHOLD = `${ALERT_NAMESPACE}.evaluation.threshold` as const;
// const ALERT_EVALUATION_VALUE = `${ALERT_NAMESPACE}.evaluation.value` as const;

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
        mappings: mappingFromFieldMap(
          {
            [ALERT_EVALUATION_THRESHOLD]: { type: 'scaled_float', scaling_factor: 100 },
            [ALERT_EVALUATION_VALUE]: { type: 'scaled_float', scaling_factor: 100 },
          },
          'strict'
        ),
      },
    ],
  });
};
