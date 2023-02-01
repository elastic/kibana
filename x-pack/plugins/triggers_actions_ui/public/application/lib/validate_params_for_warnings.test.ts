/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateParamsForWarnings } from './validate_params_for_warnings';

describe('validateParamsForWarnings', () => {
  test('returns warnings when publicUrl is not set and there are publicUrl variables used', () => {
    expect(
      validateParamsForWarnings(
        {
          subActionParams: {
            message: 'Test for {{context.alertDetailsUrl}}',
            note: 'Test for {{context.alertDetailsUrl}}',
            comments: 'Test for {{context.alertDetailsUrl}}',
            description: 'Test for {{context.alertDetailsUrl}}',
          },
        },
        undefined
      )
    ).toEqual({
      warnings: {
        comments: 'Kibana missing publicUrl environment variable. Action will use relative URLs.',
        description:
          'Kibana missing publicUrl environment variable. Action will use relative URLs.',
        message: 'Kibana missing publicUrl environment variable. Action will use relative URLs.',
        note: 'Kibana missing publicUrl environment variable. Action will use relative URLs.',
      },
    });

    expect(
      validateParamsForWarnings(
        {
          message: 'Test for {{context.alertDetailsUrl}}',
          note: 'Test for {{context.alertDetailsUrl}}',
          comments: 'Test for {{context.alertDetailsUrl}}',
          description: 'Test for {{context.alertDetailsUrl}}',
        },
        undefined
      )
    ).toEqual({
      warnings: {
        comments: 'Kibana missing publicUrl environment variable. Action will use relative URLs.',
        description:
          'Kibana missing publicUrl environment variable. Action will use relative URLs.',
        message: 'Kibana missing publicUrl environment variable. Action will use relative URLs.',
        note: 'Kibana missing publicUrl environment variable. Action will use relative URLs.',
      },
    });
  });

  test('does not return warnings when publicUrl is not set and there are publicUrl variables not used', () => {
    expect(
      validateParamsForWarnings(
        {
          subActionParams: {
            message: 'Test for {{context.test}}',
            note: 'Test for {{context.test}}',
            comments: 'Test for {{context.test}}',
            description: 'Test for {{context.test}}',
          },
        },
        undefined
      )
    ).toEqual({
      warnings: {},
    });

    expect(
      validateParamsForWarnings(
        {
          message: 'Test for {{context.test}}',
          note: 'Test for {{context.test}}',
          comments: 'Test for {{context.test}}',
          description: 'Test for {{context.test}}',
        },
        undefined
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
            message: 'Test for {{context.viewInAppUrl}}',
            note: 'Test for {{context.viewInAppUrl}}',
            comments: 'Test for {{context.viewInAppUrl}}',
            description: 'Test for {{context.viewInAppUrl}}',
          },
        },
        'http://test'
      )
    ).toEqual({
      warnings: {},
    });

    expect(
      validateParamsForWarnings(
        {
          message: 'Test for {{context.viewInAppUrl}}',
          note: 'Test for {{context.viewInAppUrl}}',
          comments: 'Test for {{context.viewInAppUrl}}',
          description: 'Test for {{context.viewInAppUrl}}',
        },
        'http://test'
      )
    ).toEqual({
      warnings: {},
    });
  });
});
