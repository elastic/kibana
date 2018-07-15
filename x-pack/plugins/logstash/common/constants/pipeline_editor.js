/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const PIPELINE_EDITOR = {
  ID_REQUIRED_ERR_MSG: 'Pipeline ID is required',
  ID_FORMAT_ERR_MSG:
    'Pipeline ID must begin with a letter or underscore and contain only letters, underscores, dashes, and numbers',
  QUEUE_TYPES: [
    {
      text: 'memory',
      value: 'memory',
    },
    {
      text: 'persisted',
      value: 'persisted',
    },
  ],
  UNITS: [
    {
      text: 'bytes',
      value: 'b',
    },
    {
      text: 'kilobytes',
      value: 'kb',
    },
    {
      text: 'megabytes',
      value: 'mb',
    },
    {
      text: 'gigabytes',
      value: 'gb',
    },
    {
      text: 'terabytes',
      value: 'tb',
    },
    {
      text: 'petabytes',
      value: 'pb',
    },
  ],
};
