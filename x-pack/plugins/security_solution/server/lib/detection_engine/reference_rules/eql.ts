/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { ApiResponse } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';

import { createPersistenceRuleTypeFactory } from '../../../../../rule_registry/server';
import { EQL_ALERT_TYPE_ID } from '../../../../common/constants';
import { buildEqlSearchRequest } from '../../../../common/detection_engine/get_query_filter';
import { SecurityRuleRegistry } from '../../../plugin';
import { EqlSignalSearchResponse } from '../signals/types';

const createSecurityEQLRuleType = createPersistenceRuleTypeFactory<SecurityRuleRegistry>();

export const eqlAlertType = createSecurityEQLRuleType({
  id: EQL_ALERT_TYPE_ID,
  name: 'EQL Rule',
  validate: {
    params: schema.object({
      eqlQuery: schema.string(),
      indexPatterns: schema.arrayOf(schema.string()),
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
    // previousStartedAt,
    rule,
    startedAt,
    services: { alertWithPersistence, findAlerts, scopedClusterClient },
    params: { indexPatterns, eqlQuery },
  }) {
    const from = moment(startedAt).subtract(moment.duration(5, 'm')).toISOString(); // hardcoded 5-minute rule interval
    const to = startedAt.toISOString();

    const request = buildEqlSearchRequest(
      eqlQuery,
      indexPatterns,
      from,
      to,
      10,
      undefined,
      [],
      undefined
    );
    const { body: response } = (await scopedClusterClient.asCurrentUser.transport.request(
      request
    )) as ApiResponse<EqlSignalSearchResponse>;

    type ValueType<T> = T extends Promise<infer U> ? U : T;
    type AlertList = ValueType<ReturnType<typeof findAlerts>>;

    const alerts: AlertList = [];
    if (response.hits.sequences !== undefined) {
      // TODO
    } else if (response.hits.events !== undefined) {
      // TODO
    } else {
      throw new Error(
        'eql query response should have either `sequences` or `events` but had neither'
      );
    }

    if (alerts.length > 0) {
      alertWithPersistence(alerts).forEach((alert) => {
        alert.scheduleActions('default', { server: 'server-test' });
      });
    }

    return {
      lastChecked: new Date(),
    };
  },
});
