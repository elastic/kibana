/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
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

describe('Severity form field', () => {
  let appMockRender: AppMockRenderer;
  const deselectCases = jest.fn();

  const props = {
    totalCases: 5,
    selectedCases: [basicCase],
    deselectCases,
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('renders', async () => {
    const result = appMockRender.render(<CasesTableUtilityBar {...props} />);
    expect(result.getByText('Showing 5 cases')).toBeInTheDocument();
    expect(result.getByText('Selected 1 case')).toBeInTheDocument();
    expect(result.getByTestId('case-table-bulk-actions-link-icon')).toBeInTheDocument();
    expect(result.getByTestId('all-cases-refresh-link-icon')).toBeInTheDocument();
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
});
