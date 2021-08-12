/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncSearchServiceLogProvider } from './async_search_service_log';

describe('async search service', () => {
  describe('asyncSearchServiceLogProvider', () => {
    it('adds and retrieves messages from the log', async () => {
      const { addLogMessage, getLogMessages } = asyncSearchServiceLogProvider();

      const mockDate = new Date(1392202800000);
      // @ts-ignore ignore the mockImplementation callback error
      const spy = jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      addLogMessage('the first message');
      addLogMessage('the second message');

      expect(getLogMessages()).toEqual([
        '2014-02-12T11:00:00.000Z: the first message',
        '2014-02-12T11:00:00.000Z: the second message',
      ]);

      spy.mockRestore();
    });
  });
});
