/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import uuid from 'uuid';
import { NativeControllerChannel } from './native_controller_channel';

test(`sends message to child process`, () => {
  const childProcess = {
    on: jest.fn(),
    send: jest.fn()
  };

  const processId = uuid.v4();

  const channel = new NativeControllerChannel(childProcess, processId);
  const type = 'foo';
  const payload = {
    argument: 'bar'
  };
  channel.send(type, payload);
  expect(childProcess.send).toHaveBeenCalledTimes(1);
  expect(childProcess.send).toHaveBeenCalledWith({
    processId,
    message: {
      id: expect.anything(),
      type,
      payload
    }
  });
});

test(`resolves send when it receives a success ack`, async () => {
  const childProcess = {
    on: jest.fn(),
    send: jest.fn()
  };

  const processId = uuid.v4();

  const channel = new NativeControllerChannel(childProcess, processId);
  const type = 'foo';
  const payload = {
    argument: 'bar'
  };

  let sendResolved = false;
  const promise = channel.send(type, payload).then(() => sendResolved = true);

  // giving it a window to resolve without the ack
  await Promise.resolve();
  expect(sendResolved).toBe(false);

  expect(childProcess.send).toHaveBeenCalledTimes(1);

  // manually calling the message callback registered with
  // nativeControllerProcess.on('message', cb)
  const messageCallback = childProcess.on.mock.calls[0][1];
  const messageId = childProcess.send.mock.calls[0][0].message.id;
  messageCallback({ processId, ack: { id: messageId, success: true } });

  await promise;
  expect(sendResolved).toBe(true);
});

test(`rejects send when it receives an error ack`, async () => {
  const childProcess = {
    on: jest.fn(),
    send: jest.fn()
  };

  const processId = uuid.v4();

  const channel = new NativeControllerChannel(childProcess, processId);
  const type = 'foo';
  const payload = {
    argument: 'bar'
  };

  let sendResolved = false;
  const promise = channel.send(type, payload).then(() => sendResolved = true);

  // giving it a window to resolve without the ack
  await Promise.resolve();
  expect(sendResolved).toBe(false);

  expect(childProcess.send).toHaveBeenCalledTimes(1);

  // manually calling the message callback registered with
  // nativeControllerProcess.on('message', cb)
  const messageCallback = childProcess.on.mock.calls[0][1];
  const messageId = childProcess.send.mock.calls[0][0].message.id;
  messageCallback({ processId, ack: { id: messageId, success: false, error: new Error('test error') } });

  expect(promise).rejects.toBeInstanceOf(Error);
});

test(`calls onMessage when message sent`, async () => {
  const childProcess = {
    on: jest.fn(),
    send: jest.fn()
  };

  const processId = uuid.v4();

  const channel = new NativeControllerChannel(childProcess, processId);

  let receivedMessage;
  channel.onMessage(channelMessage => {
    receivedMessage = channelMessage;
  });

  const message = {
    foo: 'bar'
  };

  const messageCallback = childProcess.on.mock.calls[0][1];
  messageCallback({
    processId,
    message
  });

  expect(receivedMessage).toBe(message);
});

test(`ignores messages from other processes`, async () => {
  const childProcess = {
    on: jest.fn(),
    send: jest.fn()
  };

  const processId = uuid.v4();

  const channel = new NativeControllerChannel(childProcess, processId);

  let receivedMessage;
  channel.onMessage(channelMessage => {
    receivedMessage = channelMessage;
  });

  const message = {
    foo: 'bar'
  };

  const messageCallback = childProcess.on.mock.calls[0][1];
  messageCallback({
    processId: uuid.v4(),
    message
  });

  expect(receivedMessage).not.toBeDefined();
});
