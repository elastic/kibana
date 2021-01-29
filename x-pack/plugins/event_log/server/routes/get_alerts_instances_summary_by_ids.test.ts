/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock } from 'src/core/server/mocks';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { eventLogClientMock } from '../event_log_client.mock';
import { loggingSystemMock } from 'src/core/server/mocks';
import { getAlertsInstancesSummaryByIdsRoute } from './get_alerts_instances_summary_by_ids';

const eventLogClient = eventLogClientMock.create();
const systemLogger = loggingSystemMock.createLogger();

beforeEach(() => {
  jest.resetAllMocks();
});

describe('get_alerts_instances_summary_by_ids', () => {
  it('get events for alerts by ids and group their as instances summary', async () => {
    const router = httpServiceMock.createRouter();

    getAlertsInstancesSummaryByIdsRoute(router, systemLogger);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/event_log/_alerts_instances_summary"`);

    const result = [
      {
        alertId: '25fff0f0-61b4-11eb-9d71-c3f7d68f132d',
        instances: [
          {
            instance_id: 'host-15',
            lastAction: 'recovered-instance',
            actionGroupId: '',
            actionSubgroup: '',
            activeStartDate: '',
          },
        ],
      },
    ];
    eventLogClient.getEventsForAlertInstancesSummary.mockResolvedValueOnce(result);

    const [context, req, res] = mockHandlerArguments(
      eventLogClient,
      {
        body: { ids: ['1'] },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(eventLogClient.getEventsForAlertInstancesSummary).toHaveBeenCalledTimes(1);

    const [ids] = eventLogClient.getEventsForAlertInstancesSummary.mock.calls[0];
    expect(ids).toEqual(['1']);

    expect(res.ok).toHaveBeenCalledWith({
      body: result,
    });
  });

  it('supports optional pagination parameters', async () => {
    const router = httpServiceMock.createRouter();

    getAlertsInstancesSummaryByIdsRoute(router, systemLogger);

    const [, handler] = router.post.mock.calls[0];
    eventLogClient.getEventsForAlertInstancesSummary.mockResolvedValueOnce([
      {
        alertId: '25fff0f0-61b4-11eb-9d71-c3f7d68f132d',
        instances: [
          {
            instance_id: 'host-15',
            lastAction: 'recovered-instance',
            actionGroupId: '',
            actionSubgroup: '',
            activeStartDate: '',
          },
        ],
      },
    ]);

    const [context, req, res] = mockHandlerArguments(
      eventLogClient,
      {
        body: { ids: ['1'] },
        query: { start: '2323', end: '232333' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(eventLogClient.getEventsForAlertInstancesSummary).toHaveBeenCalledTimes(1);

    const [id, options] = eventLogClient.getEventsForAlertInstancesSummary.mock.calls[0];
    expect(id).toEqual(['1']);
    expect(options).toMatchObject({});

    expect(res.ok).toHaveBeenCalledWith([
      {
        alertId: '25fff0f0-61b4-11eb-9d71-c3f7d68f132d',
        instances: [
          {
            instance_id: 'host-15',
            lastAction: 'recovered-instance',
            actionGroupId: '',
            actionSubgroup: '',
            activeStartDate: '',
          },
        ],
      },
    ]);
  });

  it('logs a warning when the query throws an error', async () => {
    const router = httpServiceMock.createRouter();

    getAlertsInstancesSummaryByIdsRoute(router, systemLogger);

    const [, handler] = router.post.mock.calls[0];
    eventLogClient.getEventsForAlertInstancesSummary.mockRejectedValueOnce(new Error('oof!'));

    const [context, req, res] = mockHandlerArguments(
      eventLogClient,
      {
        body: { ids: ['1'] },
        query: { start: '2342343', end: '456456' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(systemLogger.debug).toHaveBeenCalledTimes(1);
    expect(systemLogger.debug).toHaveBeenCalledWith(
      'error calling eventLog getEventsForAlertInstancesSummary([1], {"start":"2342343","end":"456456"}): oof!'
    );
  });
});
