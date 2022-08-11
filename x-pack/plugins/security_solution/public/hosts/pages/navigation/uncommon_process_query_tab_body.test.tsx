/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { useUncommonProcesses } from '../../containers/uncommon_processes';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { UncommonProcessQueryTabBody } from './uncommon_process_query_tab_body';
import { HostsType } from '../../store/model';

jest.mock('../../containers/uncommon_processes');
jest.mock('../../../common/containers/query_toggle');
jest.mock('../../../common/lib/kibana');

describe('Uncommon process query tab body', () => {
  const mockUseUncommonProcesses = useUncommonProcesses as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const defaultProps = {
    indexNames: [],
    setQuery: jest.fn(),
    skip: false,
    startDate: '2019-06-25T04:31:59.345Z',
    endDate: '2019-06-25T06:31:59.345Z',
    type: HostsType.page,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
    mockUseUncommonProcesses.mockReturnValue([
      false,
      {
        uncommonProcesses: [],
        id: '123',
        inspect: {
          dsl: [],
          response: [],
        },
        isInspected: false,
        totalCount: 0,
        pageInfo: { activePage: 1, fakeTotalCount: 100, showMorePagesIndicator: false },
        loadPage: jest.fn(),
        refetch: jest.fn(),
      },
    ]);
  });
  it('toggleStatus=true, do not skip', () => {
    render(
      <TestProviders>
        <UncommonProcessQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseUncommonProcesses.mock.calls[0][0].skip).toEqual(false);
  });
  it('toggleStatus=false, skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <UncommonProcessQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseUncommonProcesses.mock.calls[0][0].skip).toEqual(true);
  });
});
