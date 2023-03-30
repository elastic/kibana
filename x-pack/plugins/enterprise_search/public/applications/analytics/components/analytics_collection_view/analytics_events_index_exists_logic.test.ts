/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { Status } from '../../../../../common/types/api';

import { AnalyticsEventsIndexExistsLogic } from './analytics_events_index_exists_logic';

describe('analyticsEventsIndexExistsLogic', () => {
  const { mount } = new LogicMounter(AnalyticsEventsIndexExistsLogic);
  const indexName = true;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mount();
  });

  const DEFAULT_VALUES = {
    data: undefined,
    isLoading: true,
    isPresent: false,
    status: Status.IDLE,
  };

  it('has expected default values', () => {
    expect(AnalyticsEventsIndexExistsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('selectors', () => {
    it('updates when apiSuccess listener triggered', () => {
      AnalyticsEventsIndexExistsLogic.actions.apiSuccess({ exists: indexName });

      expect(AnalyticsEventsIndexExistsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        isLoading: false,
        isPresent: true,
        status: Status.SUCCESS,
        data: { exists: indexName },
      });
    });
  });
});
