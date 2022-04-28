/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '../../mock/match_media';

import { TestProviders } from '../../mock';
import { useAuthentications } from '../../containers/authentications';
import { useQueryToggle } from '../../containers/query_toggle';
import { AuthenticationsUserTable } from './authentications_user_table';
import { usersModel } from '../../../users/store';
import { AuthStackByField } from '../../../../common/search_strategy';

jest.mock('../../containers/query_toggle', () => ({
  useQueryToggle: jest.fn().mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() }),
}));
jest.mock('../../containers/authentications', () => ({
  useAuthentications: jest.fn().mockReturnValue([
    false,
    {
      authentications: [],
      totalCount: 0,
      pageInfo: {},
      loadPage: jest.fn(),
      inspect: {},
      isInspected: false,
      refetch: jest.fn(),
    },
  ]),
}));

describe('Authentication User Table Component', () => {
  const mockUseAuthentications = useAuthentications as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;

  const startDate = '2020-07-07T08:20:18.966Z';
  const endDate = '3000-01-01T00:00:00.000Z';
  const defaultProps = {
    type: usersModel.UsersType.page,
    startDate,
    endDate,
    skip: false,
    setQuery: jest.fn(),
    indexNames: [],
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    test('it renders the user authentication table', () => {
      const { getByTestId } = render(
        <TestProviders>
          <AuthenticationsUserTable {...defaultProps} />
        </TestProviders>
      );

      expect(getByTestId('table-users-authentications-loading-false')).toMatchSnapshot();
    });
  });

  it('toggleStatus=true, do not skip', () => {
    render(
      <TestProviders>
        <AuthenticationsUserTable {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseAuthentications.mock.calls[0][0].skip).toEqual(false);
  });

  it('toggleStatus=false, skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <AuthenticationsUserTable {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseAuthentications.mock.calls[0][0].skip).toEqual(true);
  });

  describe('useAuthentications', () => {
    it('calls useAuthentications stacked by username when username is undefined', () => {
      render(
        <TestProviders>
          <AuthenticationsUserTable {...defaultProps} userName={undefined} />
        </TestProviders>
      );
      expect(mockUseAuthentications.mock.calls[0][0].stackByField).toEqual(
        AuthStackByField.userName
      );
    });

    it('calls useAuthentications stacked by hostname when there username is defined', () => {
      render(
        <TestProviders>
          <AuthenticationsUserTable {...defaultProps} userName={'test username'} />
        </TestProviders>
      );
      expect(mockUseAuthentications.mock.calls[0][0].stackByField).toEqual(
        AuthStackByField.hostName
      );
    });
  });
});
