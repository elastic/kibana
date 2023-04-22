/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import type { MemoryRouterProps } from 'react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  noCreateCasesPermissions,
  noUpdateCasesPermissions,
  readCasesPermissions,
  TestProviders,
} from '../../common/mock';
import { CasesRoutes } from './routes';
import type { CasesPermissions } from '../../../common';

jest.mock('../all_cases', () => ({
  AllCases: () => <div>{'All cases'}</div>,
}));

jest.mock('../create', () => ({
  CreateCase: () => <div>{'Create case'}</div>,
}));

jest.mock('../configure_cases', () => ({
  ConfigureCases: () => <div>{'Configure cases'}</div>,
}));

const getCaseViewPaths = () => ['/cases/test-id', '/cases/test-id/comment-id'];

const renderWithRouter = (
  initialEntries: MemoryRouterProps['initialEntries'] = ['/cases'],
  permissions?: CasesPermissions
) => {
  return render(
    <TestProviders permissions={permissions}>
      <MemoryRouter initialEntries={initialEntries}>
        <CasesRoutes useFetchAlertData={(alertIds) => [false, {}]} />
      </MemoryRouter>
    </TestProviders>
  );
};

describe('Cases routes', () => {
  describe('All cases', () => {
    it('navigates to the all cases page', () => {
      renderWithRouter();
      expect(screen.getByText('All cases')).toBeInTheDocument();
    });

    // User has read only privileges
    it('user can navigate to the all cases page with only read permissions', () => {
      renderWithRouter(['/cases'], readCasesPermissions());
      expect(screen.getByText('All cases')).toBeInTheDocument();
    });
  });

  describe('Case view', () => {
    it.each(getCaseViewPaths())(
      'navigates to the cases view page for path: %s',
      async (path: string) => {
        renderWithRouter([path]);
        await waitFor(() => {
          expect(screen.getByTestId('case-view-loading')).toBeInTheDocument();
        });

        // User has read only privileges
      }
    );

    it.each(getCaseViewPaths())(
      'user can navigate to the cases view page with read permissions and path: %s',
      async (path: string) => {
        renderWithRouter([path], readCasesPermissions());
        await waitFor(() => {
          expect(screen.getByTestId('case-view-loading')).toBeInTheDocument();
        });
      }
    );
  });

  describe('Create case', () => {
    it('navigates to the create case page', () => {
      renderWithRouter(['/cases/create']);
      expect(screen.getByText('Create case')).toBeInTheDocument();
    });

    it('shows the no privileges page if the user does not have create privileges', () => {
      renderWithRouter(['/cases/create'], noCreateCasesPermissions());
      expect(screen.getByText('Privileges required')).toBeInTheDocument();
    });
  });

  describe('Configure cases', () => {
    it('navigates to the configure cases page', () => {
      renderWithRouter(['/cases/configure']);
      expect(screen.getByText('Configure cases')).toBeInTheDocument();
    });

    it('shows the no privileges page if the user does not have update privileges', () => {
      renderWithRouter(['/cases/configure'], noUpdateCasesPermissions());
      expect(screen.getByText('Privileges required')).toBeInTheDocument();
    });
  });
});
