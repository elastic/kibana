/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { Status } from '../../../../../common/types/api';

import { AnalyticsCollectionDataViewIdLogic } from './analytics_collection_data_view_id_logic';

describe('analyticsCollectionDataViewIdLogic', () => {
  const { mount } = new LogicMounter(AnalyticsCollectionDataViewIdLogic);
  const dataViewIdMock = '0c3edf-0c3edf-0c3edf-0c3edf-0c3edf';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mount();
  });

  const DEFAULT_VALUES = {
    data: undefined,
    dataViewId: null,
    status: Status.IDLE,
  };

  it('has expected default values', () => {
    expect(AnalyticsCollectionDataViewIdLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('selectors', () => {
    it('updates when apiSuccess listener triggered', () => {
      AnalyticsCollectionDataViewIdLogic.actions.apiSuccess({ data_view_id: dataViewIdMock });

      expect(AnalyticsCollectionDataViewIdLogic.values).toEqual({
        ...DEFAULT_VALUES,
        data: { data_view_id: dataViewIdMock },
        dataViewId: dataViewIdMock,
        status: Status.SUCCESS,
      });
    });
  });
});
