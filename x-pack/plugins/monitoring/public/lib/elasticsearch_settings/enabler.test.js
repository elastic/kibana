/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Enabler } from '.';
import { forbidden } from '@hapi/boom';

const updateModelSpy = jest.fn((properties) => properties);

describe('Settings Enabler Class for calling API to update Elasticsearch Settings', () => {
  test('should return status from successfully calling API', async () => {
    const get$http = () => ({
      put() {
        return Promise.resolve({
          data: {
            acknowledged: true,
          },
        });
      },
    });
    const enabler = new Enabler(get$http(), updateModelSpy);

    await enabler.enableCollectionInterval();

    expect(updateModelSpy).toHaveBeenCalledTimes(2);
    expect(updateModelSpy.mock.calls[0][0]).toEqual({
      isCollectionIntervalUpdating: true,
    });
    expect(updateModelSpy.mock.calls[1][0]).toEqual({
      isCollectionIntervalUpdated: true,
      isCollectionIntervalUpdating: false,
    });
  });

  test('should return status from unsuccessfully calling API', async () => {
    const get$http = () => ({
      put() {
        const error = forbidden(new Error('this is not available'));
        return Promise.reject({ data: error.output.payload });
      },
    });

    const enabler = new Enabler(get$http(), updateModelSpy);
    await enabler.enableCollectionInterval();

    expect(updateModelSpy).toHaveBeenCalledTimes(4);
    expect(updateModelSpy.mock.calls[0][0]).toEqual({
      isCollectionIntervalUpdating: true,
    });
    expect(updateModelSpy.mock.calls[updateModelSpy.mock.calls.length - 1][0]).toEqual({
      errors: {
        error: 'Forbidden',
        message: 'this is not available',
        statusCode: 403,
      },
      isCollectionIntervalUpdated: false,
      isCollectionIntervalUpdating: false,
    });
  });
});
