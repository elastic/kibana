/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { MAX_DOCS_PER_PAGE } from '../../../common/constants';
import {
  noCasesPermissions,
  onlyDeleteCasesPermission,
  createAppMockRenderer,
  writeCasesPermissions,
} from '../../common/mock';
import { casesQueriesKeys } from '../../containers/constants';
import { basicCase } from '../../containers/mock';
import { CasesTableUtilityBar } from './utility_bar';

describe('Severity form field', () => {
  let appMockRender: AppMockRenderer;
  const deselectCases = jest.fn();

  const props = {
    totalCases: 5,
    selectedCases: [basicCase],
    deselectCases,
    pagination: {
      pageIndex: 1,
      pageSize: 10,
      totalItemCount: 5,
    }
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('renders', async () => {
    appMockRender.render(<CasesTableUtilityBar {...props} />);
    expect(screen.getByText('Showing 5 of 5 cases')).toBeInTheDocument();
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
      }
    }
    appMockRender.render(<CasesTableUtilityBar {...updatedProps} />);
    expect(screen.getByText('Showing 10 of 20 cases')).toBeInTheDocument();
    expect(screen.getByText('Selected 1 case')).toBeInTheDocument();
  });

  it('renders showing cases correctly for second page', async () => {
    const updatedProps = {
      ...props,
      totalCases: 20,
      pagination: {
        ...props.pagination,
        pageIndex: 2,
        totalItemCount: 20,
      }
    }
    appMockRender.render(<CasesTableUtilityBar {...updatedProps} />);
    expect(screen.getByText('Showing 10 of 20 cases')).toBeInTheDocument();
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
      }
    }
    appMockRender.render(<CasesTableUtilityBar {...updatedProps} />);
    expect(screen.getByText('Showing 0 of 0 cases')).toBeInTheDocument();
  });

  it('opens the bulk actions correctly', async () => {
    const result = appMockRender.render(<CasesTableUtilityBar {...props} />);

    act(() => {
      userEvent.click(result.getByTestId('case-table-bulk-actions-link-icon'));
    });

    await waitFor(() => {
      expect(result.getByTestId('case-table-bulk-actions-context-menu'));
    });
  });

  it('closes the bulk actions correctly', async () => {
    const result = appMockRender.render(<CasesTableUtilityBar {...props} />);

    act(() => {
      userEvent.click(result.getByTestId('case-table-bulk-actions-link-icon'));
    });

    await waitFor(() => {
      expect(result.getByTestId('case-table-bulk-actions-context-menu'));
    });

    act(() => {
      userEvent.click(result.getByTestId('case-table-bulk-actions-link-icon'));
    });

    await waitFor(() => {
      expect(result.queryByTestId('case-table-bulk-actions-context-menu')).toBeFalsy();
    });
  });

  it('refresh correctly', async () => {
    const result = appMockRender.render(<CasesTableUtilityBar {...props} />);
    const queryClientSpy = jest.spyOn(appMockRender.queryClient, 'invalidateQueries');

    act(() => {
      userEvent.click(result.getByTestId('all-cases-refresh-link-icon'));
    });

    await waitFor(() => {
      expect(deselectCases).toHaveBeenCalled();
      expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.casesList());
      expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
      expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.userProfiles());
    });
  });

  it('does not show the bulk actions without update & delete permissions', async () => {
    appMockRender = createAppMockRenderer({ permissions: noCasesPermissions() });
    const result = appMockRender.render(<CasesTableUtilityBar {...props} />);

    expect(result.queryByTestId('case-table-bulk-actions-link-icon')).toBeFalsy();
  });

  it('does show the bulk actions with only delete permissions', async () => {
    appMockRender = createAppMockRenderer({ permissions: onlyDeleteCasesPermission() });
    const result = appMockRender.render(<CasesTableUtilityBar {...props} />);

    expect(result.getByTestId('case-table-bulk-actions-link-icon')).toBeInTheDocument();
  });

  it('does show the bulk actions with update permissions', async () => {
    appMockRender = createAppMockRenderer({ permissions: writeCasesPermissions() });
    const result = appMockRender.render(<CasesTableUtilityBar {...props} />);

    expect(result.getByTestId('case-table-bulk-actions-link-icon')).toBeInTheDocument();
  });

  it('does not show the bulk actions if there are not selected cases', async () => {
    const result = appMockRender.render(<CasesTableUtilityBar {...props} selectedCases={[]} />);

    expect(result.queryByTestId('case-table-bulk-actions-link-icon')).toBeFalsy();
    expect(result.queryByText('Showing 0 cases')).toBeFalsy();
  });

  describe('Maximum number of cases', () => {
    const newProps = {
      ...props,
      selectedCaseS: [],
      totalCases: MAX_DOCS_PER_PAGE,
      pagination: {
       ...props.pagination,
        totalItemCount: MAX_DOCS_PER_PAGE,
      }
    };

    const allCasesPageSize = [10,25,50,100];

    it.each(allCasesPageSize)(
      `does not show warning when totalCases = ${MAX_DOCS_PER_PAGE} but pageSize(%s) * pageIndex + 1 < ${MAX_DOCS_PER_PAGE}`,
      (size) => {
        const newPageIndex = (MAX_DOCS_PER_PAGE / size) - 2;

        console.log({size, newPageIndex})
        appMockRender.render(<CasesTableUtilityBar{...{...newProps, pagination: {...newProps.pagination, pageSize: size, pageIndex: newPageIndex}}}/>);
        expect(screen.getByText(`Showing ${size} of ${MAX_DOCS_PER_PAGE} cases`)).toBeInTheDocument();
        expect(screen.queryByTestId('all-cases-maximum-limit-warning')).not.toBeInTheDocument();
      }
    );

    it.each(allCasesPageSize)(
      `shows warning when totalCases = ${MAX_DOCS_PER_PAGE} but pageSize(%s) * pageIndex + 1 = ${MAX_DOCS_PER_PAGE}`,
      (size) => {
        const newPageIndex = (MAX_DOCS_PER_PAGE / size) - 1;

        console.log({size, newPageIndex})
        appMockRender.render(<CasesTableUtilityBar{...{...newProps, pagination: {...newProps.pagination, pageSize: size, pageIndex: newPageIndex}}}/>);
        expect(screen.getByText(`Showing ${size} of ${MAX_DOCS_PER_PAGE} cases`)).toBeInTheDocument();
        expect(screen.getByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
      }
    );

    it.each(allCasesPageSize)(
      `shows warning when totalCases = ${MAX_DOCS_PER_PAGE} but pageSize(%s) * pageIndex + 1 > ${MAX_DOCS_PER_PAGE}`,
      (size) => {
        const newPageIndex = MAX_DOCS_PER_PAGE / size;

        console.log({size, newPageIndex})
        appMockRender.render(<CasesTableUtilityBar{...{...newProps, pagination: {...newProps.pagination, pageSize: size, pageIndex: newPageIndex}}}/>);
        expect(screen.getByText(`Showing ${size} of ${MAX_DOCS_PER_PAGE} cases`)).toBeInTheDocument();
        expect(screen.getByTestId('all-cases-maximum-limit-warning')).toBeInTheDocument();
      }
    );
  });
});
