/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { SERVER_APP_ID } from '../../../../../common/constants';

import type { BucketHistory } from './alert_suppression/group_and_bulk_create';
import type { UnifiedQueryRuleParams } from '../../rule_schema';
import { unifiedQueryRuleParams } from '../../rule_schema';
import { queryExecutor } from './query';
import type { CreateQueryRuleOptions, SecurityAlertType } from '../types';
import { validateIndexPatterns } from '../utils';

export interface QueryRuleState {
  suppressionGroupHistory?: BucketHistory[];
  [key: string]: unknown;
}

export const createQueryAlertType = (
  createOptions: CreateQueryRuleOptions
): SecurityAlertType<UnifiedQueryRuleParams, QueryRuleState, {}, 'default'> => {
  const {
    eventsTelemetry,
    experimentalFeatures,
    version,
    osqueryCreateAction,
    licensing,
    id,
    name,
  } = createOptions;
  return {
    id,
    name,
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
      const { runOpts, services, spaceId, state } = execOptions;
      return queryExecutor({
        runOpts,
        experimentalFeatures,
        eventsTelemetry,
        services,
        version,
        spaceId,
        bucketHistory: state.suppressionGroupHistory,
        osqueryCreateAction,
        licensing,
      });
    },
  };
};
