/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { mockHandlerArguments, fakeEvent } from './_mock_handler_arguments';
import { eventLogClientMock } from '../event_log_client.mock';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { findByIdsRoute } from './find_by_ids';

const eventLogClient = eventLogClientMock.create();
const systemLogger = loggingSystemMock.createLogger();

beforeEach(() => {
  jest.resetAllMocks();
});

describe('find_by_ids', () => {
  it('finds events with proper parameters', async () => {
    const router = httpServiceMock.createRouter();

    findByIdsRoute(router, systemLogger);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/event_log/{type}/_find"`);

    const events = [fakeEvent(), fakeEvent()];
    const result = {
      page: 0,
      per_page: 10,
      total: events.length,
      data: events,
    };
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(result);

    const [context, req, res] = mockHandlerArguments(
      eventLogClient,
      {
        params: { type: 'action' },
        body: { ids: ['1'], legacyIds: ['2'] },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(1);

    const [type, ids, , legacyIds] = eventLogClient.findEventsBySavedObjectIds.mock.calls[0];
    expect(type).toEqual(`action`);
    expect(ids).toEqual(['1']);
    expect(legacyIds).toEqual(['2']);

    expect(res.ok).toHaveBeenCalledWith({
      body: result,
    });
  });

  it('supports optional pagination parameters', async () => {
    const router = httpServiceMock.createRouter();

    findByIdsRoute(router, systemLogger);

    const [, handler] = router.post.mock.calls[0];
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce({
      page: 0,
      per_page: 10,
      total: 0,
      data: [],
    });

    const [context, req, res] = mockHandlerArguments(
      eventLogClient,
      {
        params: { type: 'action' },
        body: { ids: ['1'] },
        query: { page: 3, per_page: 10 },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(1);

    const [type, id, options] = eventLogClient.findEventsBySavedObjectIds.mock.calls[0];
    expect(type).toEqual(`action`);
    expect(id).toEqual(['1']);
    expect(options).toMatchObject({});

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        page: 0,
        per_page: 10,
        total: 0,
        data: [],
      },
    });
  });

  it('logs a warning when the query throws an error', async () => {
    const router = httpServiceMock.createRouter();

    findByIdsRoute(router, systemLogger);

    const [, handler] = router.post.mock.calls[0];
    eventLogClient.findEventsBySavedObjectIds.mockRejectedValueOnce(new Error('oof!'));

    const [context, req, res] = mockHandlerArguments(
      eventLogClient,
      {
        params: { type: 'action' },
        body: { ids: ['1'] },
        query: { page: 3, per_page: 10 },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(systemLogger.debug).toHaveBeenCalledTimes(1);
    expect(systemLogger.debug).toHaveBeenCalledWith(
      'error calling eventLog findEventsBySavedObjectIds(action, [1], {"page":3,"per_page":10}): oof!'
    );
  });
});
