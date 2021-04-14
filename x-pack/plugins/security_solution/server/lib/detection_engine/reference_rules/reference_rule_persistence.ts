/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { buildEsQuery, IIndexPattern } from '../../../../../../../src/plugins/data/common';

import { createPersistenceRuleTypeFactory } from '../../../../../rule_registry/server';
import { REFERENCE_RULE_PERSISTENCE_ALERT_TYPE_ID } from '../../../../common/constants';
import { SecurityRuleRegistry } from '../../../plugin';

const createSecurityPersistenceRuleType = createPersistenceRuleTypeFactory<SecurityRuleRegistry>();

export const referenceRulePersistenceAlertType = createSecurityPersistenceRuleType({
  id: REFERENCE_RULE_PERSISTENCE_ALERT_TYPE_ID,
  name: 'ReferenceRule persistence alert type',
  validate: {
    params: schema.object({
      query: schema.string(),
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
  async executor({ services: { alertWithPersistence, findAlerts }, params }) {
    const indexPattern: IIndexPattern = {
      fields: [],
      title: '*',
    };

    const esQuery = buildEsQuery(indexPattern, { query: params.query, language: 'kuery' }, []);
    const query = {
      body: {
        query: {
          bool: {
            must: esQuery.bool.must, // FIXME
          },
        },
        fields: ['*'],
        sort: {
          '@timestamp': 'asc' as const,
        },
      },
    };

    const alerts = await findAlerts(query);
    alertWithPersistence(alerts).forEach((alert) => {
      alert.scheduleActions('default', { server: 'server-test' });
    });

    return {
      lastChecked: new Date(),
    };
  },
});
