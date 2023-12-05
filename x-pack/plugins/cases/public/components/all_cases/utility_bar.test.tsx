/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_DOCS_PER_PAGE } from '../../../common/constants';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { AppMockRenderer } from '../../common/mock';

import {
  noCasesPermissions,
  onlyDeleteCasesPermission,
  createAppMockRenderer,
  writeCasesPermissions,
} from '../../common/mock';
import { casesQueriesKeys } from '../../containers/constants';
import { basicCase } from '../../containers/mock';
import { CasesTableUtilityBar } from './utility_bar';

describe('Utility bar', () => {
  let appMockRender: AppMockRenderer;
  const deselectCases = jest.fn();
  const allCasesPageSize = [10, 25, 50, 100];

  const props = {
    totalCases: 5,
    selectedCases: [basicCase],
    deselectCases,
    pagination: {
      pageIndex: 0,
      pageSize: 10,
      totalItemCount: 5,
    },
    selectedColumns: [],
    onSelectedColumnsChange: jest.fn(),
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('renders', async () => {
    appMockRender.render(<CasesTableUtilityBar {...props} />);
    expect(screen.getByText('Showing 1 to 5 of 5 cases')).toBeInTheDocument();
    expect(screen.getByText('Selected 1 case')).toBeInTheDocument();
    expect(screen.getByTestId('case-table-bulk-actions-link-icon')).toBeInTheDocument();
    expect(screen.getByTestId('all-cases-refresh-link-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('all-cases-maximum-limit-warning')).not.toBeInTheDocument();
  });

  it('renders showing cases correctly', async () => {
    const updatedProps = {
      ...props,
      totalCases: 20,
      pagination: {
        ...props.pagination,
        totalItemCount: 20,
      },
    };
    appMockRender.render(<CasesTableUtilityBar {...updatedProps} />);
    expect(screen.getByText('Showing 1 to 10 of 20 cases')).toBeInTheDocument();
    expect(screen.getByText('Selected 1 case')).toBeInTheDocument();
  });

  it('renders showing cases correctly for second page', async () => {
    const updatedProps = {
      ...props,
      totalCases: 20,
      pagination: {
        ...props.pagination,
        pageIndex: 1,
        totalItemCount: 20,
      },
    };
    appMockRender.render(<CasesTableUtilityBar {...updatedProps} />);
    expect(screen.getByText('Showing 11 to 20 of 20 cases')).toBeInTheDocument();
    expect(screen.getByText('Selected 1 case')).toBeInTheDocument();
  });

  it('renders showing cases correctly when no cases available', async () => {
    const updatedProps = {
      totalCases: 0,
      selectedCases: [],
      deselectCases,
      pagination: {
        pageSize: 10,
        pageIndex: 1,
        totalItemCount: 0,
      },
      selectedColumns: [],
      onSelectedColumnsChange: jest.fn(),
    };
    appMockRender.render(<CasesTableUtilityBar {...updatedProps} />);
    expect(screen.getByText('Showing 0 of 0 cases')).toBeInTheDocument();
  });

  it('renders columns popover button when isSelectorView=False', async () => {
    appMockRender.render(<CasesTableUtilityBar {...props} />);
    expect(screen.getByTestId('column-selection-popover-button')).toBeInTheDocument();
  });

  it('does not render columns popover button when isSelectorView=True', async () => {
    appMockRender.render(<CasesTableUtilityBar {...props} isSelectorView={true} />);
    expect(screen.queryByTestId('column-selection-popover-button')).not.toBeInTheDocument();
  });

  it('opens the bulk actions correctly', async () => {
    appMockRender.render(<CasesTableUtilityBar {...props} />);

    userEvent.click(screen.getByTestId('case-table-bulk-actions-link-icon'));

    await waitFor(() => {
      expect(screen.getByTestId('case-table-bulk-actions-context-menu'));
    });
  });

  it('closes the bulk actions correctly', async () => {
    appMockRender.render(<CasesTableUtilityBar {...props} />);

    userEvent.click(screen.getByTestId('case-table-bulk-actions-link-icon'));

    await waitFor(() => {
      expect(screen.getByTestId('case-table-bulk-actions-context-menu'));
    });

    userEvent.click(screen.getByTestId('case-table-bulk-actions-link-icon'));

    await waitFor(() => {
      expect(screen.queryByTestId('case-table-bulk-actions-context-menu')).toBeFalsy();
    });
  });

  it('refresh correctly', async () => {
    appMockRender.render(<CasesTableUtilityBar {...props} />);
    const queryClientSpy = jest.spyOn(appMockRender.queryClient, 'invalidateQueries');

    userEvent.click(screen.getByTestId('all-cases-refresh-link-icon'));

    await waitFor(() => {
      expect(deselectCases).toHaveBeenCalled();
      expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.casesList());
      expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
      expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.userProfiles());
    });
  });

  it('does not show the bulk actions without update & delete permissions', async () => {
    appMockRender = createAppMockRenderer({ permissions: noCasesPermissions() });
    appMockRender.render(<CasesTableUtilityBar {...props} />);

    expect(screen.queryByTestId('case-table-bulk-actions-link-icon')).toBeFalsy();
  });

  it('does show the bulk actions with only delete permissions', async () => {
    appMockRender = createAppMockRenderer({ permissions: onlyDeleteCasesPermission() });
    appMockRender.render(<CasesTableUtilityBar {...props} />);

    expect(screen.getByTestId('case-table-bulk-actions-link-icon')).toBeInTheDocument();
  });

  it('does show the bulk actions with update permissions', async () => {
    appMockRender = createAppMockRenderer({ permissions: writeCasesPermissions() });
    appMockRender.render(<CasesTableUtilityBar {...props} />);

    expect(screen.getByTestId('case-table-bulk-actions-link-icon')).toBeInTheDocument();
  });

  it('does not show the bulk actions if there are not selected cases', async () => {
    appMockRender.render(<CasesTableUtilityBar {...props} selectedCases={[]} />);

    expect(screen.queryByTestId('case-table-bulk-actions-link-icon')).toBeFalsy();
    expect(screen.queryByText('Showing 0 cases')).toBeFalsy();
  });

  it.each(allCasesPageSize)(`renders showing cases message correctly`, (size) => {
    const newPageIndex = MAX_DOCS_PER_PAGE / size - 1;
    const pageStart = size * newPageIndex + 1;

    appMockRender.render(
      <CasesTableUtilityBar
        {...{
          ...props,
          totalCases: MAX_DOCS_PER_PAGE,
          pagination: { ...props.pagination, pageSize: size, pageIndex: newPageIndex },
        }}
      />
    );

    expect(
      screen.getByText(`Showing ${pageStart} to ${size} of ${MAX_DOCS_PER_PAGE} cases`)
    ).toBeInTheDocument();
    expect(screen.getByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
  });
});
