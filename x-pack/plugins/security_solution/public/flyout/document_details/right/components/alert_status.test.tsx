/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { AlertStatus } from './alert_status';
import { RightPanelContext } from '../context';
import { WORKFLOW_STATUS_DETAILS_TEST_ID, WORKFLOW_STATUS_TITLE_TEST_ID } from './test_ids';
import { mockSearchHit } from '../../shared/mocks/mock_search_hit';
import { TestProviders } from '../../../../common/mock';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';

jest.mock('../../../../common/components/user_profiles/use_bulk_get_user_profiles');

const renderAlertStatus = (contextValue: RightPanelContext) =>
  render(
    <TestProviders>
      <RightPanelContext.Provider value={contextValue}>
        <AlertStatus />
      </RightPanelContext.Provider>
    </TestProviders>
  );

const mockUserProfiles = [
  { uid: 'user-id-1', enabled: true, user: { username: 'user1', full_name: 'User 1' }, data: {} },
];

describe('<AlertStatus />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render alert status history information', async () => {
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockUserProfiles,
    });
    const contextValue = {
      searchHit: {
        ...mockSearchHit,
        fields: {
          'kibana.alert.workflow_user': 'user-id-1',
          'kibana.alert.workflow_status_updated_at': '2023-11-01T22:33:26.893Z',
        },
      },
    } as unknown as RightPanelContext;

    const { getByTestId } = renderAlertStatus(contextValue);

    await act(async () => {
      expect(getByTestId(WORKFLOW_STATUS_TITLE_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(WORKFLOW_STATUS_DETAILS_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render empty component if missing workflow_user value', async () => {
    const contextValue = {
      searchHit: {
        some_field: 'some_value',
      },
    } as unknown as RightPanelContext;

    const { container } = renderAlertStatus(contextValue);

    await act(async () => {
      expect(container).toBeEmptyDOMElement();
    });
  });
});
