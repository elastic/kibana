/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const filebeatOsqueryRules = [
  {
    // pre-ECS
    when: {
      exists: ['osquery.result.name'],
    },
    format: [
      {
        constant: '[Osquery][',
      },
      {
        field: 'osquery.result.action',
      },
      {
        constant: '] ',
      },
      {
        field: 'osquery.result.host_identifier',
      },
      {
        constant: ' ',
      },
      {
        fieldsPrefix: 'osquery.result.columns',
      },
    ],
  },
];
