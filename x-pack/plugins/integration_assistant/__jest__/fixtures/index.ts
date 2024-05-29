/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const mockedRequest = {
  rawSamples: [
    '{ "timestamp": "2020-10-19 19:31:31", "cpu_usage": 0.1, "class": "general", "event": "status", "test_array": ["test1", "test2"]}',
    '{ "timestamp": "2020-10-19 19:32:10", "cpu_usage": 0.2, "class": "connection", "event": "disconnect", "bytes": 16, "account": { "user": "audit_test_user2", "ip": "10.10.10.10" }}',
  ],
  packageName: 'mysql_enterprise',
  dataStreamName: 'audit',
};
