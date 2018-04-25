/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import path from 'path';
import { NativeControllerChildProcess } from './child_process';
import { getArgs, getPackage } from '../server/browsers/browsers';
import startNativeController from './index.js';

jest.mock('./child_process');

jest.mock('../server/browsers/browsers', () => {
  return {
    getArgs: jest.fn(),
    getPackage: jest.fn().mockReturnValue({
      binaryRelativePath: ''
    }),
  };
});

const getRandomInt = () => {
  return Math.floor(Math.random() * Math.floor(10000));
};

beforeEach(() => {
  // process.send is only a function when this is a Child Process
  // which in the context of a test we are not
  process.send = jest.fn();
});

afterEach(() => {
  delete process.send;
  NativeControllerChildProcess.mockClear();
  getArgs.mockClear();
  getPackage.mockClear();
  process.removeAllListeners();
});

describe(`errors`, () => {
  test(`no processId in messageEnvelope calls process.send with error`, () => {
    startNativeController();
    process.emit('message', {});

    expect(process.send).toHaveBeenCalledTimes(1);
    expect(process.send).toHaveBeenCalledWith({ error: expect.anything() });
  });

  test(`no message calls process.send with error`, () => {
    startNativeController();
    process.emit('message', {
      processId: 1,
    });

    expect(process.send).toHaveBeenCalledTimes(1);
    expect(process.send).toHaveBeenCalledWith({ error: expect.anything() });
  });

  test(`no message.id calls process.send with error`, () => {
    startNativeController();
    process.emit('message', {
      processId: 1,
      message: {
      }
    });

    expect(process.send).toHaveBeenCalledTimes(1);
    expect(process.send).toHaveBeenCalledWith({ error: expect.anything() });
  });
});

describe('spawn', () => {
  describe('errors', () => {
    test(`spawn without payload acks with error`, () => {
      startNativeController();
      const processId = getRandomInt();
      const messageId = getRandomInt();
      process.emit('message', {
        processId,
        message: {
          id: messageId,
          type: 'spawn',
        }
      });

      expect(process.send).toHaveBeenCalledTimes(1);
      expect(process.send).toHaveBeenCalledWith({
        processId,
        ack: {
          id: messageId,
          success: false,
          error: expect.anything()
        }
      });
    });
  });

  test(`calls getPackage with browserType`, () => {
    startNativeController(new Map([['path.data', '/tmp']]));
    const browserType = 'chromium';

    process.emit('message', {
      processId: 1,
      message: {
        id: 1,
        type: 'spawn',
        payload: {
          browserType,
        }
      }
    });

    expect(getPackage).toHaveBeenCalledTimes(1);
    expect(getPackage).toHaveBeenCalledWith(browserType);
  });

  test(`calls getArgs with browserType and params`, () => {
    startNativeController(new Map([['path.data', '/tmp']]));
    const browserType = 'chromium';
    const params = {
      foo: 'bar'
    };

    process.emit('message', {
      processId: 1,
      message: {
        id: 1,
        type: 'spawn',
        payload: {
          browserType,
          params,
        }
      }
    });

    expect(getArgs).toHaveBeenCalledTimes(1);
    expect(getArgs).toHaveBeenCalledWith(browserType, params);
  });

  test(`creates NativeControllerChildProcess`, () => {
    const installsPath = '/tmp';
    startNativeController(new Map([['path.data', installsPath]]));
    const processId = getRandomInt();
    const browserType = 'chromium';
    const params = {
      foo: 'bar'
    };

    const args = [1, 2, 3];
    getArgs.mockReturnValue(args);

    const binaryRelativePath = 'how/about/here.exe';
    getPackage.mockReturnValue({ binaryRelativePath });

    process.emit('message', {
      processId,
      message: {
        id: 1,
        type: 'spawn',
        payload: {
          browserType,
          params,
        }
      }
    });

    expect(NativeControllerChildProcess).toHaveBeenCalledTimes(1);
    expect(NativeControllerChildProcess).toHaveBeenCalledWith(processId, path.join(installsPath, binaryRelativePath), args);
  });

  test(`acks success`, () => {
    startNativeController(new Map([['path.data', '/tmp']]));
    const processId = getRandomInt();
    const messageId = getRandomInt();

    process.emit('message', {
      processId,
      message: {
        id: messageId,
        type: 'spawn',
        payload: {
          browserType: 'chromium',
          params: {},
        }
      }
    });

    expect(process.send).toHaveBeenCalledTimes(1);
    expect(process.send).toHaveBeenCalledWith({
      processId,
      ack: {
        id: messageId,
        success: true
      }
    });
  });
});

describe('kill', () => {
  describe('errors', () => {
    test(`kill with wrong processId acks error`, () => {
      startNativeController(new Map([['path.data', '/tmp']]));
      const processId = getRandomInt();
      const messageId = getRandomInt();

      process.emit('message', {
        processId,
        message: {
          id: messageId,
          type: 'kill',
        }
      });

      expect(process.send).toHaveBeenCalledTimes(1);
      expect(process.send).toHaveBeenCalledWith({
        processId,
        ack: {
          id: messageId,
          success: false,
          error: expect.anything()
        }
      });
    });
  });

  const spawnProcess = (processId) => {
    const messageId = getRandomInt();

    process.emit('message', {
      processId,
      message: {
        id: messageId,
        type: 'spawn',
        payload: {
          browserType: 'chromium',
          params: {},
        }
      }
    });
  };

  test(`kill without payload calls kill without signal`, () => {
    startNativeController(new Map([['path.data', '/tmp']]));
    const processId = getRandomInt();
    spawnProcess(processId);

    process.emit('message', {
      processId,
      message: {
        id: processId,
        type: 'kill'
      }
    });

    const childProcess = NativeControllerChildProcess.mock.instances[0];

    expect(childProcess.kill).toHaveBeenCalledTimes(1);
    expect(childProcess.kill).toHaveBeenCalledWith(undefined);
  });

  test(`kill with payload calls kill with signal`, () => {
    startNativeController(new Map([['path.data', '/tmp']]));

    const processId = getRandomInt();
    spawnProcess(processId);

    const signal = 'SIGKILL';
    process.emit('message', {
      processId,
      message: {
        id: getRandomInt(),
        type: 'kill',
        payload: signal
      }
    });

    const childProcess = NativeControllerChildProcess.mock.instances[0];

    expect(childProcess.kill).toHaveBeenCalledTimes(1);
    expect(childProcess.kill).toHaveBeenCalledWith(signal);
  });

  test(`successful kill acks`, () => {
    startNativeController(new Map([['path.data', '/tmp']]));

    const processId = getRandomInt();
    const messageId = getRandomInt();

    spawnProcess(processId);

    const signal = 'SIGKILL';
    process.emit('message', {
      processId,
      message: {
        id: messageId,
        type: 'kill',
        payload: signal
      }
    });

    expect(process.send).toHaveBeenCalledTimes(2);
    expect(process.send).toHaveBeenLastCalledWith({
      processId,
      ack: {
        id: messageId,
        success: true
      }
    });
  });
});
