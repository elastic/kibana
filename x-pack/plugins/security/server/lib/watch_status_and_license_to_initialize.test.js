/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventEmitter } from 'events';
import { watchStatusAndLicenseToInitialize } from './watch_status_and_license_to_initialize';

const createMockXpackMainPluginAndFeature = (featureId) => {
  const licenseChangeCallbacks = [];

  const mockFeature = {
    getLicenseCheckResults: jest.fn(),
    mock: {
      triggerLicenseChange: () => {
        for (const callback of licenseChangeCallbacks) {
          callback();
        }
      },
      setLicenseCheckResults: (value) => {
        mockFeature.getLicenseCheckResults.mockReturnValue(value);
      }
    }
  };

  const mockXpackMainPlugin = {
    info: {
      onLicenseInfoChange: (callback) => {
        licenseChangeCallbacks.push(callback);
      },
      feature: (id) => {
        if (id === featureId) {
          return mockFeature;
        }
        throw new Error('Unexpected feature');
      }
    },
    status: new EventEmitter(),
    mock: {
      setStatus: (state, message) => {
        mockXpackMainPlugin.status.state = state;
        mockXpackMainPlugin.status.message = message;
        mockXpackMainPlugin.status.emit('change', null, null, state, message);
      }
    }
  };

  return { mockXpackMainPlugin, mockFeature };
};

const createMockDownstreamPlugin = (id) => {
  const defaultImplementation = () => { throw new Error('Not implemented'); };
  return {
    id,
    status: {
      disabled: jest.fn().mockImplementation(defaultImplementation),
      yellow: jest.fn().mockImplementation(defaultImplementation),
      green: jest.fn().mockImplementation(defaultImplementation),
      red: jest.fn().mockImplementation(defaultImplementation),
    },
  };
};

['red', 'yellow', 'disabled'].forEach(state => {
  test(`mirrors ${state} immediately`, () => {
    const pluginId = 'foo-plugin';
    const message = `${state} is now the state`;
    const { mockXpackMainPlugin } = createMockXpackMainPluginAndFeature(pluginId);
    mockXpackMainPlugin.mock.setStatus(state, message);
    const downstreamPlugin = createMockDownstreamPlugin(pluginId);
    const initializeMock = jest.fn();
    downstreamPlugin.status[state].mockImplementation(() => { });

    watchStatusAndLicenseToInitialize(mockXpackMainPlugin, downstreamPlugin, initializeMock);

    expect(initializeMock).not.toHaveBeenCalled();
    expect(downstreamPlugin.status[state]).toHaveBeenCalledTimes(1);
    expect(downstreamPlugin.status[state]).toHaveBeenCalledWith(message);
  });
});

test(`calls initialize and doesn't immediately set downstream status when the initial status is green`, () => {
  const pluginId = 'foo-plugin';
  const { mockXpackMainPlugin, mockFeature } = createMockXpackMainPluginAndFeature(pluginId);
  mockXpackMainPlugin.mock.setStatus('green', 'green is now the state');
  const licenseCheckResults = Symbol();
  mockFeature.mock.setLicenseCheckResults(licenseCheckResults);
  const downstreamPlugin = createMockDownstreamPlugin(pluginId);
  const initializeMock = jest.fn().mockImplementation(() => new Promise(() => { }));

  watchStatusAndLicenseToInitialize(mockXpackMainPlugin, downstreamPlugin, initializeMock);

  expect(initializeMock).toHaveBeenCalledTimes(1);
  expect(initializeMock).toHaveBeenCalledWith(licenseCheckResults);
  expect(downstreamPlugin.status.green).toHaveBeenCalledTimes(0);
});

test(`sets downstream plugin's status to green when initialize resolves`, (done) => {
  const pluginId = 'foo-plugin';
  const { mockXpackMainPlugin, mockFeature } = createMockXpackMainPluginAndFeature(pluginId);
  mockXpackMainPlugin.mock.setStatus('green', 'green is now the state');
  const licenseCheckResults = Symbol();
  mockFeature.mock.setLicenseCheckResults(licenseCheckResults);
  const downstreamPlugin = createMockDownstreamPlugin(pluginId);
  const initializeMock = jest.fn().mockImplementation(() => Promise.resolve());

  watchStatusAndLicenseToInitialize(mockXpackMainPlugin, downstreamPlugin, initializeMock);

  expect(initializeMock).toHaveBeenCalledTimes(1);
  expect(initializeMock).toHaveBeenCalledWith(licenseCheckResults);
  downstreamPlugin.status.green.mockImplementation(actualMessage => {
    expect(actualMessage).toBe('Ready');
    done();
  });
});

test(`sets downstream plugin's status to red when initialize rejects 20 times`, (done) => {
  jest.useFakeTimers();

  const pluginId = 'foo-plugin';
  const errorMessage = 'the error message';
  const { mockXpackMainPlugin, mockFeature } = createMockXpackMainPluginAndFeature(pluginId);
  mockXpackMainPlugin.mock.setStatus('green');
  const licenseCheckResults = Symbol();
  mockFeature.mock.setLicenseCheckResults(licenseCheckResults);
  const downstreamPlugin = createMockDownstreamPlugin(pluginId);

  let initializeCount = 0;
  const initializeMock = jest.fn().mockImplementation(() => {
    ++initializeCount;

    // everytime this is called, we have to wait for a new promise to be resolved
    // allowing the Promise the we return below to run, and then advance the timers
    setImmediate(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(initializeCount * 100);
    });
    return Promise.reject(new Error(errorMessage));
  });

  watchStatusAndLicenseToInitialize(mockXpackMainPlugin, downstreamPlugin, initializeMock);

  expect(initializeMock).toHaveBeenCalledTimes(1);
  expect(initializeMock).toHaveBeenCalledWith(licenseCheckResults);
  downstreamPlugin.status.red.mockImplementation(message => {
    expect(initializeCount).toBe(20);
    expect(message).toBe(errorMessage);
    done();
  });
});

test(`sets downstream plugin's status to green when initialize resolves after rejecting 10 times`, (done) => {
  jest.useFakeTimers();

  const pluginId = 'foo-plugin';
  const errorMessage = 'the error message';
  const { mockXpackMainPlugin, mockFeature } = createMockXpackMainPluginAndFeature(pluginId);
  mockXpackMainPlugin.mock.setStatus('green');
  const licenseCheckResults = Symbol();
  mockFeature.mock.setLicenseCheckResults(licenseCheckResults);
  const downstreamPlugin = createMockDownstreamPlugin(pluginId);

  let initializeCount = 0;
  const initializeMock = jest.fn().mockImplementation(() => {
    ++initializeCount;

    // everytime this is called, we have to wait for a new promise to be resolved
    // allowing the Promise the we return below to run, and then advance the timers
    setImmediate(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(initializeCount * 100);
    });

    if (initializeCount >= 10) {
      return Promise.resolve();
    }

    return Promise.reject(new Error(errorMessage));
  });

  watchStatusAndLicenseToInitialize(mockXpackMainPlugin, downstreamPlugin, initializeMock);

  expect(initializeMock).toHaveBeenCalledTimes(1);
  expect(initializeMock).toHaveBeenCalledWith(licenseCheckResults);
  downstreamPlugin.status.green.mockImplementation(message => {
    expect(initializeCount).toBe(10);
    expect(message).toBe('Ready');
    done();
  });
});

test(`calls initialize twice when it gets a new license and the status is green`, (done) => {
  const pluginId = 'foo-plugin';
  const { mockXpackMainPlugin, mockFeature } = createMockXpackMainPluginAndFeature(pluginId);
  mockXpackMainPlugin.mock.setStatus('green');
  const firstLicenseCheckResults = Symbol();
  const secondLicenseCheckResults = Symbol();
  mockFeature.mock.setLicenseCheckResults(firstLicenseCheckResults);
  const downstreamPlugin = createMockDownstreamPlugin(pluginId);
  const initializeMock = jest.fn().mockImplementation(() => Promise.resolve());

  let count = 0;
  downstreamPlugin.status.green.mockImplementation(message => {
    expect(message).toBe('Ready');
    ++count;
    if (count === 1) {
      mockFeature.mock.setLicenseCheckResults(secondLicenseCheckResults);
      mockFeature.mock.triggerLicenseChange();
    }
    if (count === 2) {
      expect(initializeMock).toHaveBeenCalledWith(firstLicenseCheckResults);
      expect(initializeMock).toHaveBeenCalledWith(secondLicenseCheckResults);
      expect(initializeMock).toHaveBeenCalledTimes(2);
      done();
    }
  });

  watchStatusAndLicenseToInitialize(mockXpackMainPlugin, downstreamPlugin, initializeMock);
});

test(`doesn't call initialize twice when it gets a new license when the status isn't green`, (done) => {
  const pluginId = 'foo-plugin';
  const redMessage = 'the red message';
  const { mockXpackMainPlugin, mockFeature } = createMockXpackMainPluginAndFeature(pluginId);
  mockXpackMainPlugin.mock.setStatus('green');
  const firstLicenseCheckResults = Symbol();
  const secondLicenseCheckResults = Symbol();
  mockFeature.mock.setLicenseCheckResults(firstLicenseCheckResults);
  const downstreamPlugin = createMockDownstreamPlugin(pluginId);
  const initializeMock = jest.fn().mockImplementation(() => Promise.resolve());

  downstreamPlugin.status.green.mockImplementation(message => {
    expect(message).toBe('Ready');
    mockXpackMainPlugin.mock.setStatus('red', redMessage);
    mockFeature.mock.setLicenseCheckResults(secondLicenseCheckResults);
    mockFeature.mock.triggerLicenseChange();
  });

  downstreamPlugin.status.red.mockImplementation(message => {
    expect(message).toBe(redMessage);
    expect(initializeMock).toHaveBeenCalledTimes(1);
    expect(initializeMock).toHaveBeenCalledWith(firstLicenseCheckResults);
    done();
  });

  watchStatusAndLicenseToInitialize(mockXpackMainPlugin, downstreamPlugin, initializeMock);
});

test(`calls initialize twice when the status changes to green twice`, (done) => {
  const pluginId = 'foo-plugin';
  const { mockXpackMainPlugin, mockFeature } = createMockXpackMainPluginAndFeature(pluginId);
  mockXpackMainPlugin.mock.setStatus('green');
  const licenseCheckResults = Symbol();
  mockFeature.mock.setLicenseCheckResults(licenseCheckResults);
  const downstreamPlugin = createMockDownstreamPlugin(pluginId);
  const initializeMock = jest.fn().mockImplementation(() => Promise.resolve());

  let count = 0;
  downstreamPlugin.status.green.mockImplementation(message => {
    expect(message).toBe('Ready');
    ++count;
    if (count === 1) {
      mockXpackMainPlugin.mock.setStatus('green');
    }
    if (count === 2) {
      expect(initializeMock).toHaveBeenCalledWith(licenseCheckResults);
      expect(initializeMock).toHaveBeenCalledTimes(2);
      done();
    }
  });

  watchStatusAndLicenseToInitialize(mockXpackMainPlugin, downstreamPlugin, initializeMock);
});

