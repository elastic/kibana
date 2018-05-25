/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AuditLogger } from './audit_logger';

test(`calls server.log with 'audit', pluginId and eventType as tags`, () => {
  const mockServer = {
    log: jest.fn()
  };
  const pluginId = 'foo';
  const auditLogger = new AuditLogger(mockServer, pluginId);

  const eventType = 'bar';
  auditLogger.log(eventType, '');
  expect(mockServer.log).toHaveBeenCalledTimes(1);
  expect(mockServer.log).toHaveBeenCalledWith(['audit', pluginId, eventType], expect.anything());
});


test(`calls server.log with message as tmpl`, () => {
  const mockServer = {
    log: jest.fn()
  };

  const auditLogger = new AuditLogger(mockServer, 'foo');

  const message = 'summary of what happened';
  auditLogger.log('bar', message);
  expect(mockServer.log).toHaveBeenCalledTimes(1);
  const call = mockServer.log.mock.calls[0];
  const logMessage = call[1];
  expect(logMessage.tmpl).toBe(message);
});

test(`calls server.log with data appended to log message`, () => {
  const mockServer = {
    log: jest.fn()
  };

  const auditLogger = new AuditLogger(mockServer, 'foo');

  const data = {
    foo: 'yup',
    bar: 'nah',
  };

  auditLogger.log('bar', 'summary of what happened', data);
  expect(mockServer.log).toHaveBeenCalledTimes(1);
  const call = mockServer.log.mock.calls[0];
  const logMessage = call[1];
  expect(logMessage.foo).toBe(data.foo);
  expect(logMessage.bar).toBe(data.bar);
});
