/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import { MemoryRouterProps } from 'react-router';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TestProviders } from '../../common/mock';
import { CasesRoutes } from './routes';

jest.mock('../all_cases', () => ({
  AllCases: () => <div>{'All cases'}</div>,
}));

jest.mock('../case_view', () => ({
  CaseView: () => <div>{'Case view'}</div>,
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
  userCanCrud = true
) => {
  return render(
    <TestProviders userCanCrud={userCanCrud}>
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
    it('user can navigate to the all cases page with userCanCrud = false', () => {
      renderWithRouter(['/cases'], false);
      expect(screen.getByText('All cases')).toBeInTheDocument();
    });
  });

  describe('Case view', () => {
    it.each(getCaseViewPaths())('navigates to the cases view page for path: %s', (path: string) => {
      renderWithRouter([path]);
      expect(screen.getByText('Case view')).toBeInTheDocument();
      // User has read only privileges
    });

    it.each(getCaseViewPaths())(
      'user can navigate to the cases view page with userCanCrud = false and path: %s',
      (path: string) => {
        renderWithRouter([path], false);
        expect(screen.getByText('Case view')).toBeInTheDocument();
      }
    );
  });

  describe('Create case', () => {
    it('navigates to the create case page', () => {
      renderWithRouter(['/cases/create']);
      expect(screen.getByText('Create case')).toBeInTheDocument();
    });

    it('shows the no privileges page if userCanCrud = false', () => {
      renderWithRouter(['/cases/create'], false);
      expect(screen.getByText('Privileges required')).toBeInTheDocument();
    });
  });

  describe('Configure cases', () => {
    it('navigates to the configure cases page', () => {
      renderWithRouter(['/cases/configure']);
      expect(screen.getByText('Configure cases')).toBeInTheDocument();
    });

    it('shows the no privileges page if userCanCrud = false', () => {
      renderWithRouter(['/cases/configure'], false);
      expect(screen.getByText('Privileges required')).toBeInTheDocument();
    });
  });
});
