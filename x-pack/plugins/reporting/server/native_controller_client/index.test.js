/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { createSpawnBrowser } from './index';
import { SyntheticProcess } from './synthetic_process';
import { NativeControllerChannel } from './native_controller_channel';
jest.mock('./native_controller_channel');

beforeEach(() => {
  NativeControllerChannel.mockReset();
});

// ensure we always cleanup the subscription
let subscription;
afterEach(() => {
  if (subscription) {
    subscription.unsubscribe();
  }
});

const noop = () => {};

test(`produces a synthetic process`, async () => {
  expect.hasAssertions();

  NativeControllerChannel.mockImplementation(() => {
    return {
      send: jest.fn(),
      onMessage: jest.fn(),
    };
  });

  const nativeControllerProcess = {};
  const spawnBrowser = createSpawnBrowser('lynx', '/tmp/', nativeControllerProcess);

  subscription = spawnBrowser().subscribe(browser => {
    expect(browser).toBeInstanceOf(SyntheticProcess);
  });
});

test(`passes payload to spawn`, async () => {
  expect.hasAssertions();

  const browserType = 'lynx';

  const params = {
    foo: 'bar'
  };

  NativeControllerChannel.mockImplementation(() => {
    return {
      send: jest.fn().mockImplementation((type, payload) => {
        if (type !== 'spawn') {
          return;
        }

        expect(payload.browserType).toBe(browserType);
        expect(payload.params).toBe(params);
      }),
      onMessage: jest.fn(),
    };
  });

  const nativeControllerProcess = {};
  const spawnBrowser = createSpawnBrowser(browserType, nativeControllerProcess);

  subscription = spawnBrowser(params).subscribe();
});

test(`produces an Error when send fails`, async () => {
  expect.hasAssertions();

  NativeControllerChannel.mockImplementation(() => {
    return {
      send: jest.fn().mockImplementation(() => Promise.reject()),
      onMessage: jest.fn(),
    };
  });

  const nativeControllerProcess = {};
  const spawnBrowser = createSpawnBrowser('lynx', '/tmp/', nativeControllerProcess);

  subscription = spawnBrowser().subscribe(noop, error => {
    expect(error).toBeInstanceOf(Error);
  });
});

test(`cancelled before spawn finishes, proc is killed`, async () => {
  expect.hasAssertions();

  NativeControllerChannel.mockImplementation(() => {
    const sendMock = jest.fn();
    sendMock.mockImplementationOnce(() => Promise.resolve());
    sendMock.mockImplementationOnce((type) => {
      expect(type).toBe('kill');
    });

    return {
      send: sendMock,
      onMessage: jest.fn(),
    };
  });

  const nativeControllerProcess = {};
  const spawnBrowser = createSpawnBrowser('lynx', '/tmp/', nativeControllerProcess);

  subscription = spawnBrowser().subscribe(() => {
    throw new Error(`We shouldn't get a browser`);
  });

  subscription.unsubscribe();
});

test(`cancelled before spawn finishes, cleanup is ran`, async () => {
  expect.hasAssertions();

  NativeControllerChannel.mockImplementation(() => {
    const sendMock = jest.fn();
    sendMock.mockImplementation(() => Promise.resolve());

    return {
      send: sendMock,
      onMessage: jest.fn(),
    };
  });

  const nativeControllerProcess = {};
  const spawnBrowser = createSpawnBrowser('lynx', '/tmp/', nativeControllerProcess);

  const cleanup = jest.fn().mockImplementation(() => {

    // apologies for the poor expect, need a way to make sure this is called asynchronously
    expect(true).toBe(true);
  });
  subscription = spawnBrowser({}, cleanup).subscribe(() => {
    throw new Error(`We shouldn't get a browser`);
  });

  subscription.unsubscribe();
});

test(`cancelled after producing value, proc is killed`, async () => {
  NativeControllerChannel.mockImplementation(() => {
    const sendMock = jest.fn();
    sendMock.mockImplementationOnce(() => Promise.resolve());
    sendMock.mockImplementationOnce((type) => {
      expect(type).toBe('kill');
    });

    return {
      send: sendMock,
      onMessage: jest.fn(),
    };
  });

  const nativeControllerProcess = {};
  const spawnBrowser = createSpawnBrowser('lynx', '/tmp/', nativeControllerProcess);

  await spawnBrowser().first().toPromise();
});

test(`cancelled after producing value, cleanup is ran`, async () => {
  expect.hasAssertions();
  NativeControllerChannel.mockImplementation(() => {
    return {
      send: jest.fn().mockImplementation(() => Promise.resolve()),
      onMessage: jest.fn(),
    };
  });

  const nativeControllerProcess = {};
  const spawnBrowser = createSpawnBrowser('lynx', '/tmp/', nativeControllerProcess);


  const cleanup = jest.fn().mockImplementation(() => {

    // apologies for the poor expect, need a way to make sure this is called asynchronously
    expect(true).toBe(true);
  });

  subscription = spawnBrowser({}, cleanup).subscribe();
});
