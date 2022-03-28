/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';

import { useQueryToggle } from '../../../common/containers/query_toggle';
import { AllUsersQueryTabBody } from './all_users_query_tab_body';
import { UsersType } from '../../store/model';

jest.mock('../../../common/containers/query_toggle');
jest.mock('../../../common/lib/kibana');

const mockSearch = jest.fn();

jest.mock('../../../common/containers/use_search_strategy', () => {
  const original = jest.requireActual('../../../common/containers/use_search_strategy');
  return {
    ...original,
    useSearchStrategy: () => ({
      search: mockSearch,
      loading: false,
      inspect: {
        dsl: [],
        response: [],
      },
      result: {
        users: [],
        totalCount: 0,
        pageInfo: { activePage: 1, fakeTotalCount: 100, showMorePagesIndicator: false },
      },
      refetch: jest.fn(),
    }),
  };
});

describe('All users query tab body', () => {
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const defaultProps = {
    skip: false,
    indexNames: [],
    setQuery: jest.fn(),
    startDate: '2019-06-25T04:31:59.345Z',
    endDate: '2019-06-25T06:31:59.345Z',
    type: UsersType.page,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls search when toggleStatus=true', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <AllUsersQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockSearch).toHaveBeenCalled();
  });

  it("doesn't calls search when toggleStatus=false", () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <AllUsersQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockSearch).not.toHaveBeenCalled();
  });
});
