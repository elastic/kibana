/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues } from '../../../__mocks__/kea_logic';
import { mockOverviewValues } from './__mocks__';

import { OverviewLogic } from './overview_logic';

describe('OverviewLogic', () => {
  const { mount } = new LogicMounter(OverviewLogic);
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(OverviewLogic.values).toEqual(mockOverviewValues);
  });

  describe('setServerData', () => {
    const feed = [{ foo: 'bar' }] as any;

    const data = {
      accountsCount: 1,
      activityFeed: feed,
      hasOrgSources: true,
      hasUsers: true,
      isOldAccount: true,
      pendingInvitationsCount: 1,
      privateSourcesCount: 1,
      sourcesCount: 1,
    };

    beforeEach(() => {
      OverviewLogic.actions.setServerData(data);
    });

    it('will set `dataLoading` to false', () => {
      expect(OverviewLogic.values).toEqual({
        ...mockOverviewValues,
        ...data,
        dataLoading: false,
      });
    });

    it('will set server values', () => {
      expect(OverviewLogic.values).toEqual({
        ...mockOverviewValues,
        ...data,
        dataLoading: false,
        hasUsers: true,
        hasOrgSources: true,
        isOldAccount: true,
        sourcesCount: 1,
        pendingInvitationsCount: 1,
        accountsCount: 1,
        privateSourcesCount: 1,
        activityFeed: feed,
      });
    });
  });

  describe('initializeOverview', () => {
    it('calls API and sets values', async () => {
      const setServerDataSpy = jest.spyOn(OverviewLogic.actions, 'setServerData');

      await OverviewLogic.actions.initializeOverview();

      expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/overview');
      expect(setServerDataSpy).toHaveBeenCalled();
    });
  });
});
