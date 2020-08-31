/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

jest.mock('../../../shared/http', () => ({ HttpLogic: { values: { http: { get: jest.fn() } } } }));
import { HttpLogic } from '../../../shared/http';

import { mockValues } from './__mocks__';
import { OverviewLogic } from './overview_logic';

describe('OverviewLogic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
    OverviewLogic.mount();
  });

  it('has expected default values', () => {
    expect(OverviewLogic.values).toEqual(mockValues);
  });

  describe('setServerData', () => {
    const feed = [{ foo: 'bar' }] as any;
    const account = {
      id: '1243',
      groups: ['Default'],
      isAdmin: true,
      isCurated: false,
      canCreatePersonalSources: true,
      viewedOnboardingPage: false,
    };
    const org = { name: 'ACME', defaultOrgName: 'Org' };

    const data = {
      accountsCount: 1,
      activityFeed: feed,
      canCreateContentSources: true,
      canCreateInvitations: true,
      fpAccount: account,
      hasOrgSources: true,
      hasUsers: true,
      isFederatedAuth: false,
      isOldAccount: true,
      organization: org,
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
      expect(OverviewLogic.values.organization).toEqual(org);
      expect(OverviewLogic.values.isFederatedAuth).toEqual(false);
      expect(OverviewLogic.values.fpAccount).toEqual(account);
      expect(OverviewLogic.values.canCreateInvitations).toEqual(true);
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

      expect(HttpLogic.values.http.get).toHaveBeenCalledWith('/api/workplace_search/overview');
      expect(setServerDataSpy).toHaveBeenCalled();
    });
  });
});
