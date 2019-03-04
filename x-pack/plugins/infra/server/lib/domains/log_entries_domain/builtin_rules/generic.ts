/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const genericRules = [
  {
    when: {
      exists: ['event.dataset', 'log.level', 'message'],
    },
    format: [
      {
        constant: '[',
      },
      {
        field: 'event.dataset',
      },
      {
        constant: '][',
      },
      {
        field: 'log.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'message',
      },
    ],
  },
  {
    when: {
      exists: ['log.level', 'message'],
    },
    format: [
      {
        constant: '[',
      },
      {
        field: 'log.level',
      },
      {
        constant: '] ',
      },
      {
        field: 'message',
      },
    ],
  },
  {
    when: {
      exists: ['message'],
    },
    format: [
      {
        field: 'message',
      },
    ],
  },
  {
    when: {
      exists: ['@message'],
    },
    format: [
      {
        field: '@message',
      },
    ],
  },
  {
    when: {
      exists: ['event.dataset', 'log.original'],
    },
    format: [
      {
        constant: '[',
      },
      {
        field: 'event.dataset',
      },
      {
        constant: '] ',
      },
      {
        field: 'log.original',
      },
    ],
  },
  {
    when: {
      exists: ['log.original'],
    },
    format: [
      {
        field: 'log.original',
      },
    ],
  },
];
