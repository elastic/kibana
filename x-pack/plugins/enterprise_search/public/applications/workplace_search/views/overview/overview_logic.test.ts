/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogicMounter, mockHttpValues } from '../../../__mocks__';

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
      canCreateContentSources: true,
      hasOrgSources: true,
      hasUsers: true,
      isOldAccount: true,
      pendingInvitationsCount: 1,
      personalSourcesCount: 1,
      sourcesCount: 1,
    };

    beforeEach(() => {
      OverviewLogic.actions.setServerData(data);
    });

    it('will set `dataLoading` to false', () => {
      expect(OverviewLogic.values.dataLoading).toEqual(false);
    });

    it('will set server values', () => {
      expect(OverviewLogic.values.hasUsers).toEqual(true);
      expect(OverviewLogic.values.hasOrgSources).toEqual(true);
      expect(OverviewLogic.values.canCreateContentSources).toEqual(true);
      expect(OverviewLogic.values.isOldAccount).toEqual(true);
      expect(OverviewLogic.values.sourcesCount).toEqual(1);
      expect(OverviewLogic.values.pendingInvitationsCount).toEqual(1);
      expect(OverviewLogic.values.accountsCount).toEqual(1);
      expect(OverviewLogic.values.personalSourcesCount).toEqual(1);
      expect(OverviewLogic.values.activityFeed).toEqual(feed);
    });
  });

  describe('initializeOverview', () => {
    it('calls API and sets values', async () => {
      const setServerDataSpy = jest.spyOn(OverviewLogic.actions, 'setServerData');

      await OverviewLogic.actions.initializeOverview();

      expect(http.get).toHaveBeenCalledWith('/api/workplace_search/overview');
      expect(setServerDataSpy).toHaveBeenCalled();
    });
  });
});
