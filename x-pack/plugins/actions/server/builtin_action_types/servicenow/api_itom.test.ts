/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '../../../../../../src/core/server';
import { externalServiceITOMMock, itomEventParams } from './mocks';
import { ExternalServiceITOM } from './types';
import { apiITOM, prepareParams } from './api_itom';
let mockedLogger: jest.Mocked<Logger>;

describe('api_itom', () => {
  let externalService: jest.Mocked<ExternalServiceITOM>;
  const eventParamsWithFormattedDate = {
    ...itomEventParams,
    time_of_event: '2021-10-13, 10:51:44',
  };

  beforeEach(() => {
    externalService = externalServiceITOMMock.create();
    jest.clearAllMocks();
  });

  describe('prepareParams', () => {
    test('it prepares the params correctly', async () => {
      expect(prepareParams(itomEventParams)).toEqual(eventParamsWithFormattedDate);
    });

    test('it removes null values', async () => {
      const { time_of_event: timeOfEvent, ...rest } = itomEventParams;
      expect(prepareParams({ ...rest, time_of_event: null })).toEqual(rest);
    });

    test('it set the time to null if it is not a proper date', async () => {
      const { time_of_event: timeOfEvent, ...rest } = itomEventParams;
      expect(prepareParams({ ...rest, time_of_event: 'not a proper date' })).toEqual(rest);
    });
  });

  describe('addEvent', () => {
    test('it adds an event correctly', async () => {
      await apiITOM.addEvent({
        externalService,
        params: itomEventParams,
        logger: mockedLogger,
      });

      expect(externalService.addEvent).toHaveBeenCalledWith(eventParamsWithFormattedDate);
    });
  });
});
