/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { RISK_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';

import type { RiskRuleParams } from '../../schemas/rule_schemas';
import { riskRuleParams } from '../../schemas/rule_schemas';
import { riskExecutor } from '../../signals/executors/risk';
import type { CreateQueryRuleOptions, SecurityAlertType } from '../types';
import { validateIndexPatterns } from '../utils';

export const createRiskAlertType = (
  createOptions: CreateQueryRuleOptions
): SecurityAlertType<RiskRuleParams, {}, {}, 'default'> => {
  const { eventsTelemetry, experimentalFeatures, version, osqueryCreateAction, licensing } =
    createOptions;
  return {
    id: RISK_RULE_TYPE_ID,
    name: 'Risk Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          const [validated, errors] = validateNonExact(object, riskRuleParams);
          if (errors != null) {
            throw new Error(errors);
          }
          if (validated == null) {
            throw new Error('Validation of rule params failed');
          }
          return validated;
        },
        /**
         * validate rule params when rule is bulk edited (update and created in future as well)
         * returned params can be modified (useful in case of version increment)
         * @param mutatedRuleParams
         * @returns mutatedRuleParams
         */
        validateMutatedParams: (mutatedRuleParams) => {
          validateIndexPatterns(mutatedRuleParams.index);

          return mutatedRuleParams;
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
    minimumLicenseRequired: 'basic', // TODO licensing?
    isExportable: false,
    producer: SERVER_APP_ID,
    async executor(execOptions) {
      const {
        runOpts: {
          inputIndex,
          runtimeMappings,
          completeRule,
          tuple,
          listClient,
          ruleExecutionLogger,
          searchAfterSize,
          bulkCreate,
          wrapHits,
          primaryTimestamp,
          secondaryTimestamp,
          unprocessedExceptions,
          exceptionFilter,
        },
        services,
        state,
      } = execOptions;
      const result = await riskExecutor({
        completeRule,
        tuple,
        listClient,
        experimentalFeatures,
        ruleExecutionLogger,
        eventsTelemetry,
        services,
        version,
        searchAfterSize,
        bulkCreate,
        wrapHits,
        inputIndex,
        runtimeMappings,
        primaryTimestamp,
        secondaryTimestamp,
        unprocessedExceptions,
        exceptionFilter,
        osqueryCreateAction,
        licensing,
      });
      return { ...result, state };
    },
  };
};
