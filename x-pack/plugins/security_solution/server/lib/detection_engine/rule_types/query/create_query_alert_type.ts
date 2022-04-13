/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';

import { queryRuleParams, QueryRuleParams } from '../../schemas/rule_schemas';
import { queryExecutor } from '../../signals/executors/query';
import { CreateRuleOptions, SecurityAlertType } from '../types';
import { validateImmutable } from '../utils';

export const createQueryAlertType = (
  createOptions: CreateRuleOptions
): SecurityAlertType<QueryRuleParams, {}, {}, 'default'> => {
  const { eventsTelemetry, experimentalFeatures, logger, version } = createOptions;
  return {
    id: QUERY_RULE_TYPE_ID,
    name: 'Custom Query Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          const [validated, errors] = validateNonExact(object, queryRuleParams);
          if (errors != null) {
            throw new Error(errors);
          }
          if (validated == null) {
            throw new Error('Validation of rule params failed');
          }
          return validated;
        },
        validateMutatedParams: (mutatedOject: unknown) => {
          const mutatedRuleParams = mutatedOject as QueryRuleParams;

          validateImmutable(mutatedRuleParams.immutable);

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
          buildRuleMessage,
          bulkCreate,
          exceptionItems,
          listClient,
          completeRule,
          searchAfterSize,
          tuple,
          wrapHits,
        },
        services,
        state,
      } = execOptions;

      const result = await queryExecutor({
        buildRuleMessage,
        bulkCreate,
        exceptionItems,
        experimentalFeatures,
        eventsTelemetry,
        listClient,
        logger,
        completeRule,
        searchAfterSize,
        services,
        tuple,
        version,
        wrapHits,
      });
      return { ...result, state };
    },
  };
};
