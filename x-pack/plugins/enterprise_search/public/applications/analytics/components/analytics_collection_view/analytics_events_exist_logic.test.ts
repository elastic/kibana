/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { Status } from '../../../../../common/types/api';

import { AnalyticsEventsExistLogic } from './analytics_events_exist_logic';

describe('analyticsEventsExistLogic', () => {
  const { mount } = new LogicMounter(AnalyticsEventsExistLogic);
  const indexName = true;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mount();
  });

  const DEFAULT_VALUES = {
    data: undefined,
    hasEvents: false,
    status: Status.IDLE,
  };

  it('has expected default values', () => {
    expect(AnalyticsEventsExistLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('selectors', () => {
    it('updates when apiSuccess listener triggered', () => {
      AnalyticsEventsExistLogic.actions.apiSuccess({ exist: indexName });

      expect(AnalyticsEventsExistLogic.values).toEqual({
        ...DEFAULT_VALUES,
        hasEvents: true,
        status: Status.SUCCESS,
        data: { exist: indexName },
      });
    });
  });
});
