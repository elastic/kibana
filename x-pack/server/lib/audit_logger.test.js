/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AuditLogger } from './audit_logger';

test(`calls server.log with 'info', audit', pluginId and eventType as tags`, () => {
  const mockServer = {
    logWithMetadata: jest.fn()
  };
  const pluginId = 'foo';
  const auditLogger = new AuditLogger(mockServer, pluginId);

  const eventType = 'bar';
  auditLogger.log(eventType, '');
  expect(mockServer.logWithMetadata).toHaveBeenCalledTimes(1);
  expect(mockServer.logWithMetadata).toHaveBeenCalledWith(['info', 'audit', pluginId, eventType], expect.anything(), expect.anything());
});


test(`calls server.log with message`, () => {
  const mockServer = {
    logWithMetadata: jest.fn()
  };

  const auditLogger = new AuditLogger(mockServer, 'foo');

  const message = 'summary of what happened';
  auditLogger.log('bar', message);
  expect(mockServer.logWithMetadata).toHaveBeenCalledTimes(1);
  expect(mockServer.logWithMetadata).toHaveBeenCalledWith(expect.anything(), message, expect.anything());
});

test(`calls server.log with metadata `, () => {
  const mockServer = {
    logWithMetadata: jest.fn()
  };

  const auditLogger = new AuditLogger(mockServer, 'foo');

  const data = {
    foo: 'yup',
    baz: 'nah',
  };

  auditLogger.log('bar', 'summary of what happened', data);
  expect(mockServer.logWithMetadata).toHaveBeenCalledTimes(1);
  expect(mockServer.logWithMetadata).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
    eventType: 'bar',
    foo: data.foo,
    baz: data.baz,
  });
});
