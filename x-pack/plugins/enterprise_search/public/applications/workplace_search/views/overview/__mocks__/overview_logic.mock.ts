/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IOverviewValues } from '../overview_logic';

import { DEFAULT_INITIAL_APP_DATA } from '../../../../../../common/__mocks__';

const { workplaceSearch: mockAppValues } = DEFAULT_INITIAL_APP_DATA;

export const mockOverviewValues = {
  accountsCount: 0,
  activityFeed: [],
  canCreateContentSources: false,
  hasOrgSources: false,
  hasUsers: false,
  isOldAccount: false,
  pendingInvitationsCount: 0,
  personalSourcesCount: 0,
  sourcesCount: 0,
  dataLoading: true,
} as IOverviewValues;

export const mockActions = {
  initializeOverview: jest.fn(() => ({})),
};

const mockValues = { ...mockOverviewValues, ...mockAppValues, isFederatedAuth: true };

jest.mock('kea', () => ({
  ...(jest.requireActual('kea') as object),
  useActions: jest.fn(() => ({ ...mockActions })),
  useValues: jest.fn(() => ({ ...mockValues })),
}));

import { useValues } from 'kea';

export const setMockValues = (values: object) => {
  (useValues as jest.Mock).mockImplementation(() => ({ ...mockValues, ...values }));
};
