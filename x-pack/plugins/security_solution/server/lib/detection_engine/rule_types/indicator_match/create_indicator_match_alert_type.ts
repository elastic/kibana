/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { INDICATOR_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';

import { threatRuleParams, ThreatRuleParams } from '../../schemas/rule_schemas';
import { threatMatchExecutor } from '../../signals/executors/threat_match';
import { CreateRuleOptions, SecurityAlertType } from '../types';
import { percolateExecutor } from './percolator/percolate_executor';
import { IRuleDataClient } from '../../../../../../rule_registry/server';

export const createIndicatorMatchAlertType = (
  createOptions: CreateRuleOptions & { percolatorRuleDataClient: IRuleDataClient }
): SecurityAlertType<ThreatRuleParams, {}, {}, 'default'> => {
  const { eventsTelemetry, experimentalFeatures, logger, version, percolatorRuleDataClient } =
    createOptions;
  return {
    id: INDICATOR_RULE_TYPE_ID,
    name: 'Indicator Match Rule',
    ruleTaskTimeout: experimentalFeatures.securityRulesCancelEnabled ? '5m' : '1d',
    validate: {
      params: {
        validate: (object: unknown) => {
          const [validated, errors] = validateNonExact(object, threatRuleParams);
          if (errors != null) {
            throw new Error(errors);
          }
          if (validated == null) {
            throw new Error('Validation of rule params failed');
          }
          return validated;
        },
      },
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    actionVariables: {
      context: [{ name: 'server', description: 'the server' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: false,
    producer: SERVER_APP_ID,
    async executor(execOptions) {
      const {
        runOpts: {
          buildRuleMessage,
          bulkCreate,
          completeRule,
          exceptionItems,
          listClient,
          searchAfterSize,
          tuple,
          tupleIndex,
          withTimeout,
          wrapHits,
        },
        services,
        state,
        spaceId,
      } = execOptions;

      // const isPercolatorEnabled = completeRule.ruleParams.percolate;
      const isPercolatorEnabled = true;
      const indicatorMatchExecutor = isPercolatorEnabled ? percolateExecutor : threatMatchExecutor;

      const result = await indicatorMatchExecutor({
        buildRuleMessage,
        bulkCreate,
        exceptionItems,
        experimentalFeatures,
        eventsTelemetry,
        listClient,
        logger,
        completeRule,
        percolatorRuleDataClient,
        searchAfterSize,
        services,
        tuple,
        version,
        wrapHits,
        tupleIndex,
        withTimeout,
        spaceId,
      });
      return { ...result, state };
    },
  };
};
