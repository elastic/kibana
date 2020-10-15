/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const nestedProcessorsErrorFixture = {
  attributes: {
    error: {
      root_cause: [
        {
          type: 'parse_exception',
          reason: '[field] required property is missing',
          property_name: 'field',
          processor_type: 'circle',
          suppressed: [
            {
              type: 'parse_exception',
              reason: '[field] required property is missing',
              property_name: 'field',
              processor_type: 'circle',
            },
            {
              type: 'parse_exception',
              reason: '[field] required property is missing',
              property_name: 'field',
              processor_type: 'circle',
              suppressed: [
                {
                  type: 'parse_exception',
                  reason: '[field] required property is missing',
                  property_name: 'field',
                  processor_type: 'csv',
                },
              ],
            },
            {
              type: 'parse_exception',
              reason: '[field] required property is missing',
              property_name: 'field',
              processor_type: 'circle',
            },
            {
              type: 'parse_exception',
              reason: '[field] required property is missing',
              property_name: 'field',
              processor_type: 'circle',
            },
            {
              type: 'parse_exception',
              reason: '[field] required property is missing',
              property_name: 'field',
              processor_type: 'circle',
            },
            {
              type: 'parse_exception',
              reason: '[field] required property is missing',
              property_name: 'field',
              processor_type: 'circle',
            },
          ],
        },
      ],
      type: 'parse_exception',
      reason: '[field] required property is missing',
      property_name: 'field',
      processor_type: 'circle',
      suppressed: [
        {
          type: 'parse_exception',
          reason: '[field] required property is missing',
          property_name: 'field',
          processor_type: 'circle',
        },
        {
          type: 'parse_exception',
          reason: '[field] required property is missing',
          property_name: 'field',
          processor_type: 'circle',
          suppressed: [
            {
              type: 'parse_exception',
              reason: '[field] required property is missing',
              property_name: 'field',
              processor_type: 'csv',
            },
          ],
        },
        {
          type: 'parse_exception',
          reason: '[field] required property is missing',
          property_name: 'field',
          processor_type: 'circle',
        },
        {
          type: 'parse_exception',
          reason: '[field] required property is missing',
          property_name: 'field',
          processor_type: 'circle',
        },
        {
          type: 'parse_exception',
          reason: '[field] required property is missing',
          property_name: 'field',
          processor_type: 'circle',
        },
        {
          type: 'parse_exception',
          reason: '[field] required property is missing',
          property_name: 'field',
          processor_type: 'circle',
        },
      ],
    },
    status: 400,
  },
};
