/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Enabler } from '../';
import sinon from 'sinon';
import { forbidden } from 'boom';

const updateModel = properties => properties;
const updateModelSpy = sinon.spy(updateModel);

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

    expect(updateModelSpy.callCount).toBe(2);
    expect(updateModelSpy.getCall(0).args[0]).toEqual({
      isCollectionIntervalUpdating: true,
    });
    expect(updateModelSpy.getCall(1).args[0]).toEqual({
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

    expect(updateModelSpy.callCount).toBe(4);
    expect(updateModelSpy.firstCall.args[0]).toEqual({
      isCollectionIntervalUpdating: true,
    });
    expect(updateModelSpy.lastCall.args[0]).toEqual({
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
