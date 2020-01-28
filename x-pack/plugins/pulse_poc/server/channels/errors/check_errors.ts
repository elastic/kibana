/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function check(es, { deploymentId, indexName }) {
  return [
    {
      owner: 'core',
      id: 'pulse_error',
      value: {
        error_id: '1',
        fix_version: '7.7.0',
      },
    },
    {
      owner: 'core',
      id: 'pulse_error',
      value: {
        error_id: '2',
        fix_version: null,
      },
    },
  ];
}
