/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { ApiResponse } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';

import { IIndexPattern } from '../../../../../../../src/plugins/data/common';
import { createPersistenceRuleTypeFactory } from '../../../../../rule_registry/server';
import { EQL_ALERT_TYPE_ID } from '../../../../common/constants';
import { buildEqlSearchRequest } from '../../../../common/detection_engine/get_query_filter';
import { SecurityRuleRegistry } from '../../../plugin';
import { buildSignalFromEvent, buildSignalGroupFromSequence } from '../signals/build_bulk_body';
import { filterDuplicateSignals } from '../signals/single_bulk_create';
import { EqlSignalSearchResponse, WrappedSignalHit } from '../signals/types';
import { wrapSignal } from '../signals/utils';

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
    const indexPattern: IIndexPattern = {
      fields: [],
      title: indexPatterns.join(),
    };

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

    let newSignals: WrappedSignalHit[] | undefined;
    if (response.hits.sequences !== undefined) {
      newSignals = response.hits.sequences.reduce(
        (acc: WrappedSignalHit[], sequence) =>
          acc.concat(buildSignalGroupFromSequence(sequence, rule, 'index-TBD')),
        []
      );
    } else if (response.hits.events !== undefined) {
      newSignals = filterDuplicateSignals(
        rule.id,
        response.hits.events.map((event) =>
          wrapSignal(buildSignalFromEvent(event, rule, true), 'index-TBD')
        )
      );
    } else {
      throw new Error(
        'eql query response should have either `sequences` or `events` but had neither'
      );
    }

    if (newSignals.length > 0) {
      alertWithPersistence(newSignals).forEach((alert) => {
        alert.scheduleActions('default', { server: 'server-test' });
      });
    }

    return {
      lastChecked: new Date(),
    };
  },
});
