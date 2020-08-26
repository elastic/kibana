/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';
import { act } from 'react-dom/test-utils';

import { mockKibanaContext } from '../../../__mocks__';

import { mockLogicValues } from './__mocks__';
import { OverviewLogic } from './overview_logic';

describe('OverviewLogic', () => {
  let unmount: any;

  beforeEach(() => {
    resetContext({});
    unmount = OverviewLogic.mount() as any;
    jest.clearAllMocks();
  });

  afterEach(() => {
    unmount();
  });

  it('has expected default values', () => {
    expect(OverviewLogic.values).toEqual(mockLogicValues);
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

  describe('setFlashMessages', () => {
    it('will set `flashMessages`', () => {
      const flashMessages = { error: ['error'] };
      OverviewLogic.actions.setFlashMessages(flashMessages);

      expect(OverviewLogic.values.flashMessages).toEqual(flashMessages);
    });
  });

  describe('setHasErrorConnecting', () => {
    it('will set `hasErrorConnecting`', () => {
      OverviewLogic.actions.setHasErrorConnecting(true);

      expect(OverviewLogic.values.hasErrorConnecting).toEqual(true);
      expect(OverviewLogic.values.dataLoading).toEqual(false);
    });
  });

  describe('initializeOverview', () => {
    it('calls API and sets values', async () => {
      const mockHttp = mockKibanaContext.http;
      const mockApi = jest.fn(() => mockLogicValues as any);
      const setServerDataSpy = jest.spyOn(OverviewLogic.actions, 'setServerData');

      await act(async () =>
        OverviewLogic.actions.initializeOverview({
          http: {
            ...mockHttp,
            get: mockApi,
          },
        })
      );

      expect(mockApi).toHaveBeenCalledWith('/api/workplace_search/overview');
      expect(setServerDataSpy).toHaveBeenCalled();
    });

    it('handles error state', async () => {
      const mockHttp = mockKibanaContext.http;
      const setHasErrorConnectingSpy = jest.spyOn(OverviewLogic.actions, 'setHasErrorConnecting');

      await act(async () =>
        OverviewLogic.actions.initializeOverview({
          http: {
            ...mockHttp,
            get: () => Promise.reject(),
          },
        })
      );

      expect(setHasErrorConnectingSpy).toHaveBeenCalled();
    });
  });
});
