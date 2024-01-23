/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagedUserDatasetKey } from '../../../../common/search_strategy/security_solution/users/managed_details';
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import {
  managedUserDetails,
  mockManagedUserData,
} from '../../../timelines/components/side_panel/new_user_detail/__mocks__';
import { UserPanelHeader } from './header';
import { mockObservedUser } from './mocks';

const mockProps = {
  userName: 'test',
  managedUser: mockManagedUserData,
  observedUser: mockObservedUser,
};

jest.mock('../../../common/components/visualization_actions/visualization_embeddable');

describe('UserPanelHeader', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <TestProviders>
        <UserPanelHeader {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('user-panel-header')).toBeInTheDocument();
  });

  it('renders observed user date when it is bigger than managed user date', () => {
    const futureDay = '2989-03-07T20:00:00.000Z';
    const { getByTestId } = render(
      <TestProviders>
        <UserPanelHeader
          {...{
            ...mockProps,
            observedUser: {
              ...mockObservedUser,
              lastSeen: {
                isLoading: false,
                date: futureDay,
              },
            },
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('user-panel-header-lastSeen').textContent).toContain('Mar 7, 2989');
  });

  it('renders managed user date when it is bigger than observed user date', () => {
    const futureDay = '2989-03-07T20:00:00.000Z';
    const entraManagedUser = managedUserDetails[ManagedUserDatasetKey.ENTRA]!;
    const { getByTestId } = render(
      <TestProviders>
        <UserPanelHeader
          {...{
            ...mockProps,
            managedUser: {
              ...mockManagedUserData,
              data: {
                [ManagedUserDatasetKey.ENTRA]: {
                  ...entraManagedUser,
                  fields: {
                    ...entraManagedUser.fields,
                    '@timestamp': [futureDay],
                  },
                },
              },
            },
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('user-panel-header-lastSeen').textContent).toContain('Mar 7, 2989');
  });

  it('renders observed and managed badges when lastSeen is defined', () => {
    const { getByTestId } = render(
      <TestProviders>
        <UserPanelHeader {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('user-panel-header-observed-badge')).toBeInTheDocument();
    expect(getByTestId('user-panel-header-managed-badge')).toBeInTheDocument();
  });

  it('does not render observed badge when lastSeen date is undefined', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <UserPanelHeader
          {...{
            ...mockProps,
            observedUser: {
              ...mockObservedUser,
              lastSeen: {
                isLoading: false,
                date: undefined,
              },
            },
          }}
        />
      </TestProviders>
    );

    expect(queryByTestId('user-panel-header-observed-badge')).not.toBeInTheDocument();
  });

  it('does not render managed badge when managed data is undefined', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <UserPanelHeader
          {...{
            ...mockProps,
            managedUser: {
              ...mockManagedUserData,
              data: {},
            },
          }}
        />
      </TestProviders>
    );

    expect(queryByTestId('user-panel-header-managed-badge')).not.toBeInTheDocument();
  });
});
