/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';

import { PersistenceServices, RuleDataClient } from '../../../../../rule_registry/server';
import { CUSTOM_ALERT_TYPE_ID } from '../../../../common/constants';
import { SetupPlugins } from '../../../../target/types/server/plugin';
import { ConfigType } from '../../../config';

import { queryRuleParams, QueryRuleParams } from '../schemas/rule_schemas';
import { getFilter } from '../signals/get_filter';
import { searchAfterAndBulkCreate } from '../signals/search_after_bulk_create';

import { createSecurityRuleTypeFactory } from './create_security_rule_type_factory';
import { createResultObject } from './utils';
interface QueryAlertState {
  [key: string]: never;
}

export const createQueryAlertType = (createOptions: {
  lists: SetupPlugins['lists'];
  logger: Logger;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  ruleDataClient: RuleDataClient;
}) => {
  const { lists, logger, mergeStrategy, ruleDataClient } = createOptions;
  const createSecurityRuleType = createSecurityRuleTypeFactory({
    lists,
    logger,
    mergeStrategy,
    ruleDataClient,
  });
  return createSecurityRuleType<QueryRuleParams, {}, PersistenceServices, {}>({
    id: CUSTOM_ALERT_TYPE_ID,
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
      const result = createResultObject<QueryAlertState>({});
      const {
        params: { filters, index, language, query },
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
      } = execOptions;
      // const { alertWithPersistence, savedObjectsClient, scopedClusterClient } = services;

      try {
        const esFilter = await getFilter({
          type: 'query',
          filters,
          language,
          query,
          savedId: undefined,
          services,
          index,
          lists: exceptionItems,
        });

        // TODO; process return value
        await searchAfterAndBulkCreate({
          tuple,
          listClient,
          exceptionsList: exceptionItems,
          ruleSO: rule,
          services,
          logger,
          eventsTelemetry: undefined, // TODO
          id: rule.id,
          inputIndexPattern: index ?? [],
          // signalsIndex: ruleParams.outputIndex, // TODO
          signalsIndex: 'abcd1234',
          filter: esFilter,
          pageSize: searchAfterSize,
          buildRuleMessage,
          bulkCreate,
          wrapHits,
        });

        /*
        alertWithPersistence(results.createdSignals).forEach((alert) => {
          alert.scheduleActions('default', { server: 'server-test' });
        });
        */
      } catch (error) {
        logger.error(error);
      }
      return result;
    },
  });
};
