/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleDataClient } from '../../../../rule_registry/server';
import { getTopAlerts } from './get_top_alerts';

const response = {
  took: 1,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 2,
      relation: 'eq',
    },
    max_score: null,
    hits: [
      {
        _index: '.kibana_smith_alerts-observability-apm-000001',
        _id: 'os5hs3kBwDeBcocIy4cc',
        _score: null,
        fields: {
          'rule.id': ['apm.error_rate'],
          'kibana.rac.alert.evaluation.value': [10.0],
          'service.environment': ['https://stag-www.elastic.co'],
          'service.name': ['elastic-co-frontend'],
          'rule.name': ['Error count threshold'],
          'kibana.rac.alert.duration.us': [23832712000],
          'kibana.rac.alert.end': ['2021-05-28T14:30:00.244Z'],
          'kibana.rac.alert.status': ['closed'],
          tags: ['apm'],
          'kibana.rac.alert.producer': ['apm'],
          'kibana.rac.alert.uuid': ['264af24e-7f67-49b1-9276-d0d417d6ba28'],
          'rule.uuid': ['6ab8a090-bf22-11eb-97de-0dd2bdc7a086'],
          'event.action': ['close'],
          '@timestamp': ['2021-05-28T14:30:00.244Z'],
          'kibana.rac.alert.id': ['apm.error_rate_elastic-co-frontend_https://stag-www.elastic.co'],
          'processor.event': ['error'],
          'kibana.rac.alert.evaluation.threshold': [1.0],
          'kibana.rac.alert.start': ['2021-05-28T07:52:47.532Z'],
          'event.kind': ['state'],
          'rule.category': ['Error count threshold'],
        },
        sort: [1622212200244],
      },
    ],
  },
};

const search = jest.fn().mockResolvedValue(response);
const ruleDataClient = ({
  getReader: () => {
    return { search };
  },
} as unknown) as RuleDataClient;
const params = {
  ruleDataClient,
  start: 0,
  end: 1,
  status: 'all' as const,
  size: 100,
};

describe('getTopAlerts', () => {
  describe('with one close event', () => {
    describe('when status = all', () => {
      it('gets one alert', async () => {
        expect(await getTopAlerts(params)).toHaveLength(1);
      });
    });

    describe('when status = open', () => {
      it('gets no alerts', async () => {
        expect(await getTopAlerts({ ...params, status: 'open' })).toHaveLength(0);
      });
    });

    describe('when status = closed', () => {
      it('gets one alert', async () => {
        expect(await getTopAlerts({ ...params, status: 'closed' })).toHaveLength(1);
      });
    });
  });
});
