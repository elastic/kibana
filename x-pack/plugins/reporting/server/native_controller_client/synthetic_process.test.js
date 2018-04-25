/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { SyntheticProcess } from './synthetic_process';

describe('#stdout', () => {
  test(`writes stdout messages to stdout stream`, done => {
    expect.hasAssertions();

    const channel = {
      onMessage: jest.fn(),
      send: jest.fn(),
    };

    const payload = 'standard output';

    const proc = new SyntheticProcess(channel);
    proc.stdout.on('data', data => {
      expect(data.toString()).toBe(payload);
      done();
    });

    const onMessage = channel.onMessage.mock.calls[0][0];
    onMessage({
      type: 'stdout',
      payload,
    });
  });
});

describe('#stderr', () => {
  test(`writes stderr messages to stderr stream`, done => {
    expect.hasAssertions();

    const channel = {
      onMessage: jest.fn(),
      send: jest.fn(),
    };

    const payload = 'standard error';

    const proc = new SyntheticProcess(channel);
    proc.stderr.on('data', data => {
      expect(data.toString()).toBe(payload);
      done();
    });

    const onMessage = channel.onMessage.mock.calls[0][0];
    onMessage({
      type: 'stderr',
      payload,
    });
  });
});

describe('#addListener', () => {
  test(`calls correct callback when receiving other message types`, done => {
    expect.hasAssertions();

    const channel = {
      onMessage: jest.fn(),
      send: jest.fn(),
    };

    const payload = 'bar';

    const proc = new SyntheticProcess(channel);

    proc.addListener('foo', payload => {
      expect(payload).toBe(payload);
      done();
    });

    proc.addListener('baz', () => {
      throw new Error('wrong callback');
    });

    const onMessage = channel.onMessage.mock.calls[0][0];
    onMessage({
      type: 'foo',
      payload,
    });
  });

  test(`calls both callbacks when receiving other message types`, done => {
    const channel = {
      onMessage: jest.fn(),
      send: jest.fn(),
    };

    const payload = 'bar';

    const proc = new SyntheticProcess(channel);

    let count = 0;
    const listener = () => {
      ++count;
      if (count === 2) {
        done();
      }
    };
    proc.addListener('foo', listener);
    proc.addListener('foo', listener);

    const onMessage = channel.onMessage.mock.calls[0][0];
    onMessage({
      type: 'foo',
      payload,
    });
  });
});

describe('#removeListener', () => {
  test(`doesn't throw Error when eventType is unknown`, () => {
    const channel = {
      onMessage: jest.fn(),
      send: jest.fn(),
    };


    const proc = new SyntheticProcess(channel);

    proc.removeListener('foo');
  });

  test(`doesn't throw Error when callback isn't registered`, () => {
    const channel = {
      onMessage: jest.fn(),
      send: jest.fn(),
    };


    const proc = new SyntheticProcess(channel);

    proc.addListener('foo', () => {});
    proc.removeListener('bar');
  });

  test(`removes the listener`, () => {
    const channel = {
      onMessage: jest.fn(),
      send: jest.fn(),
    };


    const proc = new SyntheticProcess(channel);

    const listener = () => {
      throw new Error(`I shouldn't be called`);
    };

    proc.addListener('foo', listener);
    proc.removeListener('foo', listener);

    const onMessage = channel.onMessage.mock.calls[0][0];
    onMessage({
      type: 'foo',
    });
  });
});

describe('#once', () => {
  test(`only calls callback once`, () => {
    const channel = {
      onMessage: jest.fn(),
      send: jest.fn(),
    };

    const proc = new SyntheticProcess(channel);

    let i = 0;
    proc.once('foo', () => {
      ++i;
    });

    const onMessage = channel.onMessage.mock.calls[0][0];
    onMessage({
      type: 'foo',
    });
    onMessage({
      type: 'foo',
    });
    expect(i).toBe(1);
  });
});

describe('#kill', () => {
  test(`sends kill on channel`, () => {
    const channel = {
      onMessage: jest.fn(),
      send: jest.fn(),
    };

    const proc = new SyntheticProcess(channel);
    const signal = 'SIGKILL';
    proc.kill(signal);
    expect(channel.send).toHaveBeenLastCalledWith('kill', signal);
  });

  test(`sets killed to true`, () => {
    const channel = {
      onMessage: jest.fn(),
      send: jest.fn(),
    };

    const proc = new SyntheticProcess(channel);
    expect(proc.killed).toBe(false);

    proc.kill();

    expect(proc.killed).toBe(true);
  });
});

