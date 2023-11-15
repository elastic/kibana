/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import {
  mockManagedUser,
  mockObservedUser,
} from '../../../timelines/components/side_panel/new_user_detail/__mocks__';
import { UserPanelHeader } from './header';

const mockProps = {
  userName: 'test',
  managedUser: mockManagedUser,
  observedUser: mockObservedUser,
};

jest.mock('../../../common/components/visualization_actions/visualization_embeddable');

describe('UserDetailsContent', () => {
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
    const { getByTestId } = render(
      <TestProviders>
        <UserPanelHeader
          {...{
            ...mockProps,
            managedUser: {
              ...mockManagedUser,
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

  it('does not render managed badge when lastSeen date is undefined', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <UserPanelHeader
          {...{
            ...mockProps,
            managedUser: {
              ...mockManagedUser,
              lastSeen: {
                isLoading: false,
                date: undefined,
              },
            },
          }}
        />
      </TestProviders>
    );

    expect(queryByTestId('user-panel-header-managed-badge')).not.toBeInTheDocument();
  });
});
