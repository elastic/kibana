/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import v4 from 'uuid/v4';

import { ApiResponse } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import { Logger } from '@kbn/logging';

import {
  RuleDataClient,
  createPersistenceRuleTypeFactory,
} from '../../../../../rule_registry/server';
import { EQL_ALERT_TYPE_ID } from '../../../../common/constants';
import { buildEqlSearchRequest } from '../../../../common/detection_engine/get_query_filter';
import { BaseSignalHit, EqlSignalSearchResponse } from '../signals/types';

export const createEqlAlertType = (ruleDataClient: RuleDataClient, logger: Logger) => {
  const createPersistenceRuleType = createPersistenceRuleTypeFactory({
    ruleDataClient,
    logger,
  });
  return createPersistenceRuleType({
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

      const buildSignalFromEvent = (event: BaseSignalHit) => {
        return {
          ...event,
          'event.kind': 'signal',
          'kibana.rac.alert.id': '???',
          'kibana.rac.alert.uuid': v4(),
          '@timestamp': new Date().toISOString(),
        };
      };

      /* eslint-disable @typescript-eslint/no-explicit-any */
      let alerts: any[] = [];
      if (response.hits.sequences !== undefined) {
        alerts = response.hits.sequences.reduce((allAlerts: any[], sequence) => {
          let previousAlertUuid: string | undefined;
          return [
            ...allAlerts,
            ...sequence.events.map((event, idx) => {
              const alert = {
                ...buildSignalFromEvent(event),
                'kibana.rac.alert.ancestors': previousAlertUuid != null ? [previousAlertUuid] : [],
                'kibana.rac.alert.building_block_type': 'default',
                'kibana.rac.alert.depth': idx,
              };
              previousAlertUuid = alert['kibana.rac.alert.uuid'];
              return alert;
            }),
          ];
        }, []);
      } else if (response.hits.events !== undefined) {
        alerts = response.hits.events.map((event) => {
          return buildSignalFromEvent(event);
        }, []);
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
};
