/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const unstructuredLogState = {
  lastExecutedChain: 'testchain',
  packageName: 'testPackage',
  dataStreamName: 'testDatastream',
  grokPatterns: ['%{GREEDYDATA:message}'],
  logSamples: ['dummy data'],
  jsonSamples: ['{"message":"dummy data"}'],
  finalized: false,
  ecsVersion: 'testVersion',
  errors: { test: 'testerror' },
  additionalProcessors: [],
};

export const unstructuredLogResponse = {
  grok_patterns: [
    '####<%{MONTH} %{MONTHDAY}, %{YEAR} %{TIME} (?:AM|PM) %{WORD:timezone}> <%{WORD:log_level}> <%{WORD:component}> <%{DATA:hostname}> <%{DATA:server_name}> <%{DATA:thread_info}> <%{DATA:user}> <%{DATA:empty_field}> <%{DATA:empty_field2}> <%{NUMBER:timestamp}> <%{DATA:message_id}> <%{GREEDYDATA:message}>',
  ],
};
