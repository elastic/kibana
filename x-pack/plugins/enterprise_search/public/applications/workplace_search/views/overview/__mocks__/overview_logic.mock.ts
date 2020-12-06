/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues as setMockKeaValues, setMockActions } from '../../../../__mocks__/kea.mock';
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
};

export const mockActions = {
  initializeOverview: jest.fn(() => ({})),
};

const mockValues = { ...mockOverviewValues, ...mockAppValues, isFederatedAuth: true };

setMockActions({ ...mockActions });
setMockKeaValues({ ...mockValues });

export const setMockValues = (values: object) => {
  setMockKeaValues({ ...mockValues, ...values });
};
