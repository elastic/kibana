/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { Logger } from '@kbn/logging';
import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { ESSearchRequest } from 'src/core/types/elasticsearch';

import { buildEsQuery, IIndexPattern } from '../../../../../../../src/plugins/data/common';

import { PersistenceServices, RuleDataClient } from '../../../../../rule_registry/server';
import { CUSTOM_ALERT_TYPE_ID } from '../../../../common/constants';
import { SetupPlugins } from '../../../../target/types/server/plugin';

import { queryRuleParams, QueryRuleParams } from '../schemas/rule_schemas';

import { createSecurityRuleTypeFactory } from './create_security_rule_type_factory';
import { SecurityAlertTypeReturnValue } from './types';
import { createResultObject } from './utils';

type QueryStateFields = 'previousStartedAt';
type QueryAlertState = Record<QueryStateFields, unknown>;

export const createQueryAlertType = (createOptions: {
  lists: SetupPlugins['lists'];
  logger: Logger;
  ruleDataClient: RuleDataClient;
}) => {
  const { lists, logger, ruleDataClient } = createOptions;
  const createSecurityRuleType = createSecurityRuleTypeFactory({
    lists,
    logger,
    ruleDataClient,
  });
  return createSecurityRuleType<QueryRuleParams, {}, PersistenceServices, QueryAlertState>({
    id: CUSTOM_ALERT_TYPE_ID,
    name: 'Custom Query Rule',
    validate: {
      params: {
        validate: (object: unknown): QueryRuleParams => {
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
      const result = createResultObject<QueryAlertState>({
        previousStartedAt: new Date().toISOString(),
      });
      const {
        params: { index, query },
        services: { alertWithPersistence, savedObjectsClient },
      } = execOptions;
      try {
        const indexPattern: IIndexPattern = {
          fields: [],
          title: index?.join() ?? '',
        };

        // TODO: kql or lucene?

        const esQuery = buildEsQuery(
          indexPattern,
          { query, language: 'kuery' },
          []
        ) as estypes.QueryDslQueryContainer;

        const wrappedEsQuery: ESSearchRequest = {
          body: {
            query: esQuery,
            fields: ['*'],
            sort: {
              '@timestamp': 'asc' as const,
            },
          },
        };

        // TODO: find alerts
        // const alerts = await findAlerts(query);
        const alerts: Array<Record<string, unknown>> = [];
        alertWithPersistence(alerts).forEach((alert) => {
          alert.scheduleActions('default', { server: 'server-test' });
        });
      } catch (error) {
        logger.error(error);
      }
      return result;
    },
  });
};
