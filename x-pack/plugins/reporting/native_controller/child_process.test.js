/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { NativeControllerChildProcess } from './child_process';
import { spawn } from 'child_process';
jest.mock('child_process');

const getRandomInt = () => {
  return Math.floor(Math.random() * Math.floor(10000));
};

beforeEach(() => {
  spawn.mockClear();

  // process.send is only a function when this is a Child Process
  // which in the context of a test we are not
  process.send = jest.fn();
});

afterEach(() => {
  delete process.send;
});

const mockSpawnedProcess = () => {
  const mock = {
    on: jest.fn(),
    stdout: {
      on: jest.fn()
    },
    stderr: {
      on: jest.fn()
    },
    addListener: jest.fn(),
    kill: jest.fn(),
  };
  return mock;
};

test(`constructing NativeControllerChildProcess spawns the process`, () => {
  spawn.mockReturnValue(mockSpawnedProcess());

  const command = 'something';
  const args = [1, 2, 3];
  new NativeControllerChildProcess(0, command, args);
  expect(spawn).toHaveBeenCalledTimes(1);
  expect(spawn).toHaveBeenCalledWith(command, args);
});

test(`subscribes to process.stdout data and sends message`, () => {
  const mock = mockSpawnedProcess();
  spawn.mockReturnValue(mock);

  const processId = getRandomInt();
  new NativeControllerChildProcess(processId);

  // ensuring stdout.on was called
  expect(mock.stdout.on).toHaveBeenCalledTimes(1);

  // we're listening for the 'data' event
  const call = mock.stdout.on.mock.calls[0];
  expect(call[0]).toBe('data');

  // simulating stdout data event being fired
  const fn = call[1];

  const data = 'foo';
  fn(data);

  // should have sent the message
  expect(process.send).toHaveBeenCalledTimes(1);
  expect(process.send).toHaveBeenCalledWith({
    processId,
    message: {
      type: 'stdout',
      payload: data
    },
  });
});

test(`subscribes to process.stderr data and sends message`, () => {
  const mock = mockSpawnedProcess();
  spawn.mockReturnValue(mock);

  const processId = getRandomInt();
  new NativeControllerChildProcess(processId);

  // ensuring stderr.on was called
  expect(mock.stderr.on).toHaveBeenCalledTimes(1);

  // we're listening for the 'data' event
  const call = mock.stderr.on.mock.calls[0];
  expect(call[0]).toBe('data');

  // simulating stderr data event being fired
  const fn = call[1];

  const data = 'foo';
  fn(data);

  // should have sent the message
  expect(process.send).toHaveBeenCalledTimes(1);
  expect(process.send).toHaveBeenCalledWith({
    processId,
    message: {
      type: 'stderr',
      payload: data
    },
  });
});

test(`subscribes to error and send message`, () => {
  const mock = mockSpawnedProcess();
  spawn.mockReturnValue(mock);

  const processId = getRandomInt();
  new NativeControllerChildProcess(processId);

  // ensuring we're listening to exit
  const call = mock.addListener.mock.calls.find(call => call[0] === 'error');
  expect(call).toBeDefined();

  // simulating error event being fired
  const fn = call[1];
  const data = 'foo';
  fn(data);

  expect(process.send).toHaveBeenCalledTimes(1);
  expect(process.send).toHaveBeenCalledWith({
    processId,
    message: {
      type: 'error',
      payload: data
    }
  });
});

test(`subscribes to exit and doesn't send exit message when not connected`, () => {
  const mock = mockSpawnedProcess();
  spawn.mockReturnValue(mock);

  const processId = getRandomInt();
  new NativeControllerChildProcess(processId);

  // ensuring we're listening to exit
  const call = mock.addListener.mock.calls.find(call => call[0] === 'exit');
  expect(call).toBeDefined();


  process.connected = false;

  // simulating error event being fired
  const fn = call[1];
  const data = 'foo';
  fn(data);

  expect(process.send).toHaveBeenCalledTimes(0);
});

test(`subscribes to exit and sends exit message when connected`, () => {
  const mock = mockSpawnedProcess();
  spawn.mockReturnValue(mock);

  const processId = getRandomInt();
  new NativeControllerChildProcess(processId);

  // ensuring we're listening to exit
  const call = mock.addListener.mock.calls.find(call => call[0] === 'exit');
  expect(call).toBeDefined();


  process.connected = true;

  // simulating error event being fired
  const fn = call[1];
  const data = 'foo';
  fn(data);

  expect(process.send).toHaveBeenCalledTimes(1);
  expect(process.send).toHaveBeenCalledWith({
    processId,
    message: {
      type: 'exit',
      payload: data
    }
  });
});

test(`kill calls kill on process`, () => {
  const mock = mockSpawnedProcess();
  spawn.mockReturnValue(mock);
  const childProcess = new NativeControllerChildProcess();

  const signal = 'SIGNAL';
  childProcess.kill(signal);

  expect(mock.kill).toHaveBeenCalledTimes(1);
  expect(mock.kill).toHaveBeenCalledWith(signal);
});
