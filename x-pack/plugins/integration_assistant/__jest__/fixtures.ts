/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const ecsMappingGraphRequest = {
  rawSamples: [
    '{ "timestamp": "2020-10-19 19:31:31", "id": 0, "class": "general", "event": "status", "connection_id": 16, "account": { "user": "audit_test_user2", "host": "hades.home" }, "login": { "user": "audit_test_user2", "os": "", "ip": "192.0.2.5", "proxy": "" }, "general_data": { "command": "Query", "sql_command": "create_db", "query": "create database audit_test", "status": 0 } }',
    '{ "timestamp": "2020-10-19 19:32:10", "id": 0, "class": "connection", "event": "disconnect", "connection_id": 16, "account": { "user": "audit_test_user2", "host": "hades.home" }, "login": { "user": "audit_test_user2", "os": "", "ip": "192.0.2.5", "proxy": "" }, "connection_data": { "connection_type": "ssl" } }',
  ],
  packageName: 'mysql_enterprise',
  dataStreamName: 'audit',
};
