/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogMessageFormattingRule } from '../rule_types';

const BUILTIN_GENERIC_MESSAGE_FIELDS = ['message', '@message'];

export const getGenericRules = (genericMessageFields: string[]) => [
  ...Array.from(new Set([...genericMessageFields, ...BUILTIN_GENERIC_MESSAGE_FIELDS])).reduce<
    LogMessageFormattingRule[]
  >((genericRules, fieldName) => [...genericRules, ...createGenericRulesForField(fieldName)], []),
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

const createGenericRulesForField = (fieldName: string) => [
  {
    when: {
      exists: ['event.dataset', 'log.level', fieldName],
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
        field: fieldName,
      },
    ],
  },
  {
    when: {
      exists: ['log.level', fieldName],
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
        field: fieldName,
      },
    ],
  },
  {
    when: {
      exists: [fieldName],
    },
    format: [
      {
        field: fieldName,
      },
    ],
  },
];
