/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockSearchResult } from './helper';
import { getMonitorAlerts, getMonitorDetails } from './get_monitor_details';
import * as statusCheck from '../alerts/status_check';

describe('getMonitorDetails', () => {
  it('getMonitorDetails will provide expected calls', async () => {
    expect.assertions(2);

    const uptimeEsClient = mockSearchResult([{ _source: { id: 1 } }]);

    await getMonitorDetails({
      uptimeEsClient,
      monitorId: 'fooID',
      dateStart: 'now-15m',
      dateEnd: 'now',
      rulesClient: { find: jest.fn().mockReturnValue({ data: [] }) },
    });
    expect(uptimeEsClient.baseESClient.search).toHaveBeenCalledTimes(1);

    expect((uptimeEsClient.baseESClient.search as jest.Mock).mock.calls[0]).toMatchSnapshot();
  });

  describe('getMonitorAlerts', () => {
    it('should use expected filters for the query', async function () {
      const uptimeEsClient = mockSearchResult([{ _source: { id: 1 } }]);

      jest.spyOn(statusCheck, 'formatFilterString').mockImplementation(async () => ({
        bool: {
          filter: [
            {
              bool: { should: [{ match: { 'monitor.type': 'http' } }], minimum_should_match: 1 },
            },
            {
              bool: {
                should: [{ match_phrase: { 'url.domain': 'www.cnn.com' } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      }));

      await getMonitorAlerts({
        uptimeEsClient,
        monitorId: 'fooID',
        rulesClient: {
          find: jest.fn().mockReturnValue({ data: dummyAlertRules.data }),
        },
      });
      expect(uptimeEsClient.baseESClient.search).toHaveBeenCalledTimes(3);

      const esParams = (uptimeEsClient.baseESClient.search as jest.Mock).mock.calls[0];

      expect(esParams[0].body.query).toEqual({
        bool: {
          filter: [
            {
              term: {
                'monitor.id': 'fooID',
              },
            },
            {
              bool: {
                filter: [
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          match: {
                            'monitor.type': 'http',
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        {
                          match_phrase: {
                            'url.domain': 'www.cnn.com',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      });

      expect(esParams).toMatchSnapshot();
    });
  });
});

const dummyAlertRules = {
  page: 1,
  total: 3,
  per_page: 10,
  data: [
    {
      id: '9e0cad00-31e7-11ec-b2d2-abfef52bb74d',
      consumer: 'uptime',
      tags: [],
      name: 'browser alerrt',
      enabled: true,
      throttle: null,
      schedule: { interval: '1m' },
      params: {
        search: '',
        numTimes: 5,
        timerangeUnit: 'm',
        timerangeCount: 15,
        shouldCheckStatus: true,
        shouldCheckAvailability: true,
        availability: { range: 30, rangeUnit: 'd', threshold: '99' },
        filters: { tags: [], 'url.port': [], 'observer.geo.name': [], 'monitor.type': ['browser'] },
      },
      rule_type_id: 'xpack.uptime.alerts.monitorStatus',
      created_by: null,
      updated_by: null,
      created_at: '2021-10-20T20:52:20.050Z',
      updated_at: '2021-10-20T20:52:20.050Z',
      api_key_owner: null,
      notify_when: 'onActionGroupChange',
      mute_all: false,
      muted_alert_ids: [],
      scheduled_task_id: '9e91bb80-31e7-11ec-b2d2-abfef52bb74d',
      execution_status: {
        status: 'active',
        last_execution_date: '2021-10-21T09:33:22.044Z',
        last_duration: 414,
      },
      actions: [],
    },
    {
      id: 'deb541f0-31e7-11ec-b2d2-abfef52bb74d',
      consumer: 'alerts',
      tags: [],
      name: 'http alert',
      enabled: true,
      throttle: null,
      schedule: { interval: '1m' },
      params: {
        search: '',
        numTimes: 5,
        timerangeUnit: 'm',
        timerangeCount: 15,
        shouldCheckStatus: true,
        shouldCheckAvailability: true,
        availability: { range: 30, rangeUnit: 'd', threshold: '99' },
        filters: { tags: [], 'url.port': [], 'observer.geo.name': [], 'monitor.type': ['http'] },
      },
      rule_type_id: 'xpack.uptime.alerts.monitorStatus',
      created_by: null,
      updated_by: null,
      created_at: '2021-10-20T20:54:08.529Z',
      updated_at: '2021-10-20T20:54:08.529Z',
      api_key_owner: null,
      notify_when: 'onActionGroupChange',
      mute_all: false,
      muted_alert_ids: [],
      scheduled_task_id: 'df3e2100-31e7-11ec-b2d2-abfef52bb74d',
      execution_status: {
        status: 'ok',
        last_execution_date: '2021-10-21T09:33:22.044Z',
        last_duration: 92,
      },
      actions: [],
    },
    {
      id: '5bd4f720-31e8-11ec-b2d2-abfef52bb74d',
      consumer: 'uptime',
      tags: [],
      name: 'http rule',
      enabled: true,
      throttle: null,
      schedule: { interval: '1m' },
      params: {
        search: 'url.domain : "www.cnn.com" ',
        numTimes: 5,
        timerangeUnit: 'm',
        timerangeCount: 15,
        shouldCheckStatus: true,
        shouldCheckAvailability: true,
        availability: { range: 30, rangeUnit: 'd', threshold: '99' },
        filters: { tags: [], 'url.port': [], 'observer.geo.name': [], 'monitor.type': ['http'] },
      },
      rule_type_id: 'xpack.uptime.alerts.monitorStatus',
      created_by: null,
      updated_by: null,
      created_at: '2021-10-20T20:57:38.451Z',
      updated_at: '2021-10-20T20:57:38.451Z',
      api_key_owner: null,
      notify_when: 'onActionGroupChange',
      mute_all: false,
      muted_alert_ids: [],
      scheduled_task_id: '5bf417e0-31e8-11ec-b2d2-abfef52bb74d',
      execution_status: {
        status: 'ok',
        last_execution_date: '2021-10-21T09:33:22.043Z',
        last_duration: 87,
      },
      actions: [],
    },
  ],
};
