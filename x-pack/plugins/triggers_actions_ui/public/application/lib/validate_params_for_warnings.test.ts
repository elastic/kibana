/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionVariable } from '@kbn/alerting-plugin/common';
import { validateParamsForWarnings } from './validate_params_for_warnings';

describe('validateParamsForWarnings', () => {
  const actionVariables: ActionVariable[] = [
    {
      name: 'context.url',
      description: 'Test url',
      usesPublicBaseUrl: true,
    },
    {
      name: 'context.name',
      description: 'Test name',
    },
  ];

  test('returns warnings when publicUrl is not set and there are publicUrl variables used', () => {
    expect(
      validateParamsForWarnings(
        {
          subActionParams: {
            message: 'Test for {{context.url}}',
            note: 'Test for {{context.url}}',
            comments: 'Test for {{context.url}}',
            description: 'Test for {{context.url}}',
          },
        },
        undefined,
        actionVariables
      )
    ).toEqual({
      warnings: {
        comments: 'server.publicBaseUrl is not set. Actions will use relative URLs.',
        description: 'server.publicBaseUrl is not set. Actions will use relative URLs.',
        message: 'server.publicBaseUrl is not set. Actions will use relative URLs.',
        note: 'server.publicBaseUrl is not set. Actions will use relative URLs.',
      },
    });

    expect(
      validateParamsForWarnings(
        {
          message: 'Test for {{context.url}}',
          note: 'Test for {{context.url}}',
          comments: 'Test for {{context.url}}',
          description: 'Test for {{context.url}}',
        },
        undefined,
        actionVariables
      )
    ).toEqual({
      warnings: {
        comments: 'server.publicBaseUrl is not set. Actions will use relative URLs.',
        description: 'server.publicBaseUrl is not set. Actions will use relative URLs.',
        message: 'server.publicBaseUrl is not set. Actions will use relative URLs.',
        note: 'server.publicBaseUrl is not set. Actions will use relative URLs.',
      },
    });
  });

  test('does not return warnings when publicUrl is not set and there are publicUrl variables not used', () => {
    expect(
      validateParamsForWarnings(
        {
          subActionParams: {
            message: 'Test for {{context.name}}',
            note: 'Test for {{context.name}}',
            comments: 'Test for {{context.name}}',
            description: 'Test for {{context.name}}',
          },
        },
        undefined,
        actionVariables
      )
    ).toEqual({
      warnings: {},
    });

    expect(
      validateParamsForWarnings(
        {
          message: 'Test for {{context.name}}',
          note: 'Test for {{context.name}}',
          comments: 'Test for {{context.name}}',
          description: 'Test for {{context.name}}',
        },
        undefined,
        actionVariables
      )
    ).toEqual({
      warnings: {},
    });
  });

  test('does not return warnings when publicUrl is set and there are publicUrl variables used', () => {
    expect(
      validateParamsForWarnings(
        {
          subActionParams: {
            message: 'Test for {{context.url}}',
            note: 'Test for {{context.url}}',
            comments: 'Test for {{context.url}}',
            description: 'Test for {{context.url}}',
          },
        },
        'http://test',
        actionVariables
      )
    ).toEqual({
      warnings: {},
    });

    expect(
      validateParamsForWarnings(
        {
          message: 'Test for {{context.url}}',
          note: 'Test for {{context.url}}',
          comments: 'Test for {{context.url}}',
          description: 'Test for {{context.url}}',
        },
        'http://test',
        actionVariables
      )
    ).toEqual({
      warnings: {},
    });
  });
});
