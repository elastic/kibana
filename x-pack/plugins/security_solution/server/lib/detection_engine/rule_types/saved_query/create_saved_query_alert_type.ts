/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { SAVED_QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';

import type { CompleteRule, UnifiedQueryRuleParams } from '../../rule_schema';
import { unifiedQueryRuleParams } from '../../rule_schema';
import { queryExecutor } from '../../signals/executors/query';
import type { CreateQueryRuleOptions, SecurityAlertType } from '../types';
import { validateIndexPatterns } from '../utils';

export const createSavedQueryAlertType = (
  createOptions: CreateQueryRuleOptions
): SecurityAlertType<UnifiedQueryRuleParams, {}, {}, 'default'> => {
  const { experimentalFeatures, version, osqueryCreateAction, licensing } = createOptions;
  return {
    id: SAVED_QUERY_RULE_TYPE_ID,
    name: 'Saved Query Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          const [validated, errors] = validateNonExact(object, unifiedQueryRuleParams);
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
    minimumLicenseRequired: 'basic',
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
          exceptionFilter,
          unprocessedExceptions,
        },
        services,
        state,
      } = execOptions;

      const result = await queryExecutor({
        inputIndex,
        runtimeMappings,
        completeRule: completeRule as CompleteRule<UnifiedQueryRuleParams>,
        tuple,
        experimentalFeatures,
        listClient,
        ruleExecutionLogger,
        eventsTelemetry: undefined,
        services,
        version,
        searchAfterSize,
        bulkCreate,
        wrapHits,
        primaryTimestamp,
        secondaryTimestamp,
        exceptionFilter,
        unprocessedExceptions,
        osqueryCreateAction,
        licensing,
      });
      return { ...result, state };
    },
  };
};
