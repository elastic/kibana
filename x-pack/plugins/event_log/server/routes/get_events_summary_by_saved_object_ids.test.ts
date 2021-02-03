/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock } from 'src/core/server/mocks';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { eventLogClientMock } from '../event_log_client.mock';
import { loggingSystemMock } from 'src/core/server/mocks';
import { getEventsSummaryBySavedObjectIdsRoute } from './get_events_summary_by_saved_object_ids';

const eventLogClient = eventLogClientMock.create();
const systemLogger = loggingSystemMock.createLogger();

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getEventsSummaryBySavedObjectIdsRoute', () => {
  it('get events for alerts by ids and group their as instances summary', async () => {
    const router = httpServiceMock.createRouter();

    getEventsSummaryBySavedObjectIdsRoute(router, systemLogger);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/event_log/{type}/saved_object_summary"`);

    const result = [
      {
        savedObjectId: '25fff0f0-61b4-11eb-9d71-c3f7d68f132d',
        summary: {},
      },
    ];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockResolvedValueOnce(result);

    const [context, req, res] = mockHandlerArguments(
      eventLogClient,
      {
        params: { type: 'alert' },
        body: { ids: ['1'] },
        aggs: {},
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(eventLogClient.getEventsSummaryBySavedObjectIds).toHaveBeenCalledTimes(1);

    const [ids] = eventLogClient.getEventsSummaryBySavedObjectIds.mock.calls[0];
    expect(ids).toEqual(['1']);

    expect(res.ok).toHaveBeenCalledWith({
      body: result,
    });
  });

  it('supports optional pagination parameters', async () => {
    const router = httpServiceMock.createRouter();

    getEventsSummaryBySavedObjectIdsRoute(router, systemLogger);

    const [, handler] = router.post.mock.calls[0];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockResolvedValueOnce([
      {
        savedObjectId: '25fff0f0-61b4-11eb-9d71-c3f7d68f132d',
        summary: {},
      },
    ]);

    const [context, req, res] = mockHandlerArguments(
      eventLogClient,
      {
        params: { type: 'alert' },
        body: { ids: ['1'], aggs: {} },
        query: { start: '2323', end: '232333' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(eventLogClient.getEventsSummaryBySavedObjectIds).toHaveBeenCalledTimes(1);

    const [id, options] = eventLogClient.getEventsSummaryBySavedObjectIds.mock.calls[0];
    expect(id).toEqual(['1']);
    expect(options).toMatchObject({});

    expect(res.ok).toHaveBeenCalledWith([
      {
        savedObjectId: '25fff0f0-61b4-11eb-9d71-c3f7d68f132d',
        summary: {},
      },
    ]);
  });

  it('logs a warning when the query throws an error', async () => {
    const router = httpServiceMock.createRouter();

    getEventsSummaryBySavedObjectIdsRoute(router, systemLogger);

    const [, handler] = router.post.mock.calls[0];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockRejectedValueOnce(new Error('oof!'));

    const [context, req, res] = mockHandlerArguments(
      eventLogClient,
      {
        params: { type: 'alert' },
        body: { ids: ['1'] },
        query: { start: '2342343', end: '456456' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(systemLogger.debug).toHaveBeenCalledTimes(1);
    expect(systemLogger.debug).toHaveBeenCalledWith(
      'error calling eventLog getEventsSummaryBySavedObjectIds([1], {"start":"2342343","end":"456456"}): oof!'
    );
  });
});
