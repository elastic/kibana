/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { PersistenceServices, RuleDataClient } from '../../../../../../rule_registry/server';
import { QUERY_ALERT_TYPE_ID } from '../../../../../common/constants';
import { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { ConfigType } from '../../../../config';
import { SetupPlugins } from '../../../../plugin';
import { IRuleDataPluginService } from '../../rule_execution_log/types';
import { queryRuleParams, QueryRuleParams } from '../../schemas/rule_schemas';
import { queryExecutor } from '../../signals/executors/query';
import { createSecurityRuleTypeFactory } from '../create_security_rule_type_factory';

export const createQueryAlertType = (createOptions: {
  experimentalFeatures: ExperimentalFeatures;
  indexAlias: string;
  lists: SetupPlugins['lists'];
  logger: Logger;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  ruleDataClient: RuleDataClient;
  version: string;
  ruleDataService: IRuleDataPluginService;
}) => {
  const {
    experimentalFeatures,
    indexAlias,
    lists,
    logger,
    mergeStrategy,
    ruleDataClient,
    version,
    ruleDataService,
  } = createOptions;
  const createSecurityRuleType = createSecurityRuleTypeFactory({
    indexAlias,
    lists,
    logger,
    mergeStrategy,
    ruleDataClient,
    ruleDataService,
  });
  return createSecurityRuleType<QueryRuleParams, {}, PersistenceServices, {}>({
    id: QUERY_ALERT_TYPE_ID,
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
    producer: 'security-solution',
    async executor(execOptions) {
      const {
        runOpts: {
          buildRuleMessage,
          bulkCreate,
          exceptionItems,
          listClient,
          rule,
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
        eventsTelemetry: undefined,
        listClient,
        logger,
        rule,
        searchAfterSize,
        services,
        tuple,
        version,
        wrapHits,
      });
      return { ...result, state };
    },
  });
};
