/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ParamsSchema, Params } from './alert_type_params';
import {
  SavedQueryAttributes,
  FilterStateStore,
  TimeRange,
} from '../../../../../../src/plugins/data/common';

describe('alertType Params validate()', () => {
  beforeEach(() => {});

  /**
   * The ES query Alert Type is essentially a wrapper around Kibana's Saved Queries
   * and we want to ensure these two types stay in sync.
   * This test should catch unrecoverable changes at compile time, making it easier to
   * maintain this coupling between the `Data` plugin, `Discover` and `Alerting`.
   */
  it('passes for a valid Saved Query without title and desc', async () => {
    const savedQuery: Omit<SavedQueryAttributes, 'title' | 'description'> = {
      timefilter: {
        to: 'now',
        from: 'now-15m',
        mode: 'relative',
        refreshInterval: { pause: false, value: 300 },
      },
      filters: [
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: { query: 'hi' },
        },
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
          },
          query: { query: 'hi' },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
        },
      ],
      query: { query: 'bye', language: 'kuery' },
    };

    expect(ParamsSchema.validate(savedQuery)).toEqual(savedQuery);

    // ensure the Typescript types are interchangable between Params & SavedQueryAttributes
    type SavedQueryAttributesWithoutCertainFields = Omit<
      SavedQueryAttributes,
      'title' | 'description' | 'timefilter'
    > & { timefilter?: TimeRange };

    const savedQueryViaParams: SavedQueryAttributesWithoutCertainFields = ParamsSchema.validate(
      savedQuery
    );
    const savedQueryAsParams: Params = ParamsSchema.validate(savedQuery);

    expect(ParamsSchema.validate(savedQueryViaParams)).toEqual(savedQueryViaParams);
    expect(ParamsSchema.validate(savedQueryAsParams)).toEqual(savedQueryAsParams);
  });
});
