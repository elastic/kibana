/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import { Logger } from '@kbn/logging';
import { ESSearchRequest } from 'typings/elasticsearch';

import { buildEsQuery, IIndexPattern } from '../../../../../../../src/plugins/data/common';

import {
  RuleDataClient,
  createPersistenceRuleTypeFactory,
} from '../../../../../rule_registry/server';
import { CUSTOM_ALERT_TYPE_ID } from '../../../../common/constants';

export const createQueryAlertType = (ruleDataClient: RuleDataClient, logger: Logger) => {
  const createPersistenceRuleType = createPersistenceRuleTypeFactory({
    ruleDataClient,
    logger,
  });
  return createPersistenceRuleType({
    id: CUSTOM_ALERT_TYPE_ID,
    name: 'Custom Query Rule',
    validate: {
      params: schema.object({
        indexPatterns: schema.arrayOf(schema.string()),
        customQuery: schema.string(),
      }),
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
    producer: 'security-solution',
    async executor({
      services: { alertWithPersistence, findAlerts },
      params: { indexPatterns, customQuery },
    }) {
      try {
        const indexPattern: IIndexPattern = {
          fields: [],
          title: indexPatterns.join(),
        };

        // TODO: kql or lucene?

        const esQuery = buildEsQuery(
          indexPattern,
          { query: customQuery, language: 'kuery' },
          []
        ) as estypes.QueryDslQueryContainer;
        const query: ESSearchRequest = {
          body: {
            query: esQuery,
            fields: ['*'],
            sort: {
              '@timestamp': 'asc' as const,
            },
          },
        };

        const alerts = await findAlerts(query);
        // console.log('alerts', alerts);
        alertWithPersistence(alerts).forEach((alert) => {
          alert.scheduleActions('default', { server: 'server-test' });
        });

        return {
          lastChecked: new Date(),
        };
      } catch (error) {
        logger.error(error);
      }
    },
  });
};
