/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const PIPELINE_EDITOR = {
  DELETE_PIPELINE_MODAL_MESSAGE: `You cannot recover a deleted pipeline.`,
  ID_REQUIRED_ERR_MSG: 'Pipeline ID is required',
  ID_FORMAT_ERR_MSG:
    'Pipeline ID must begin with a letter or underscore and contain only letters, underscores, dashes, and numbers',
  QUEUE_TYPES: [
    {
      'data-test-subj': 'selectQueueType-memory',
      text: 'memory',
      value: 'memory',
    },
    {
      'data-test-subj': 'selectQueueType-persisted',
      text: 'persisted',
      value: 'persisted',
    },
  ],
  UNITS: [
    {
      'data-test-subj': 'selectQueueMaxBytesUnits-b',
      text: 'bytes',
      value: 'b',
    },
    {
      'data-test-subj': 'selectQueueMaxBytesUnits-kb',
      text: 'kilobytes',
      value: 'kb',
    },
    {
      'data-test-subj': 'selectQueueMaxBytesUnits-mb',
      text: 'megabytes',
      value: 'mb',
    },
    {
      'data-test-subj': 'selectQueueMaxBytesUnits-gb',
      text: 'gigabytes',
      value: 'gb',
    },
    {
      'data-test-subj': 'selectQueueMaxBytesUnits-tb',
      text: 'terabytes',
      value: 'tb',
    },
    {
      'data-test-subj': 'selectQueueMaxBytesUnits-pb',
      text: 'petabytes',
      value: 'pb',
    },
  ],
};
