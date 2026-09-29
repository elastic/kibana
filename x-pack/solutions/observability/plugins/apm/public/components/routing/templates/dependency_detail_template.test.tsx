/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS, AppHeader as MockAppHeaderComponent } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { ApmMainTemplateHeaderProps } from './apm_main_template';
import { DependencyDetailTemplate } from './dependency_detail_template';

// Stable link stub — returns a recognisable string per path.
const mockLink = vi.fn((path: string) => `/link${path}`);

vi.mock('../../../hooks/use_apm_router', () => {
      const mocked = {
      useApmRouter: () => ({ link: mockLink }),
    };
      return { ...mocked, default: mocked };
    });

// Default params; individual tests override `mockPath` and `mockQuery` as needed.
let mockPath = '/dependencies/overview';
const mockQuery = {
  dependencyName: 'postgresql',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  refreshInterval: 60000,
  refreshPaused: true,
  environment: 'ENVIRONMENT_ALL',
  kuery: '',
  comparisonEnabled: false,
  offset: undefined,
};

vi.mock('../../../hooks/use_apm_params', () => {
      const mocked = {
      useApmParams: () => ({ query: mockQuery }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_apm_route_path', () => {
      const mocked = {
      useApmRoutePath: () => mockPath,
    };
      return { ...mocked, default: mocked };
    });

// Pass-through provider — neutralises the useFetcher(getApmIndexSettings) call that would
// otherwise fire useKibana() against an undefined apmSourcesAccess service in jsdom.
vi.mock('../../../context/apm_index_settings/apm_index_settings_context', () => {
      const mocked = {
      ApmIndexSettingsContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      ApmIndexSettingsContext: {},
    };
      return { ...mocked, default: mocked };
    });

// Render ApmMainTemplate as a thin wrapper that passes `header` straight into a real AppHeader
// (so we exercise the full tab-building logic without wiring up the template's own dependencies).
// MockAppHeaderComponent is aliased to start with "Mock" so Jest's factory out-of-scope check permits it.
vi.mock('./apm_main_template', () => {
      const mocked = {
      ApmMainTemplate: ({
        header,
        children,
      }: {
        header?: ApmMainTemplateHeaderProps;
        children?: React.ReactNode;
      }) => (
        <>
          {header ? <MockAppHeaderComponent {...header} /> : null}
          {children}
        </>
      ),
    };
      return { ...mocked, default: mocked };
    });

function renderTemplate(path: string = '/dependencies/overview') {
  mockPath = path;
  return render(
    <MockAppHeaderProvider>
      <DependencyDetailTemplate>
        <div data-test-subj="content">page content</div>
      </DependencyDetailTemplate>
    </MockAppHeaderProvider>
  );
}

describe('DependencyDetailTemplate', () => {
  beforeEach(() => {
    mockLink.mockImplementation((path: string) => `/link${path}`);
  });

  it('renders AppHeader with the dependency name as the title', () => {
    renderTemplate();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('postgresql');
  });

  it('renders the tab row', () => {
    renderTemplate();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.tabs)).toBeInTheDocument();
  });

  it('marks the Overview tab as selected on /dependencies/overview', () => {
    renderTemplate('/dependencies/overview');

    expect(screen.getByTestId('apmDependencyDetailTab_overview')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('apmDependencyDetailTab_operations')).not.toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('marks the Operations tab as selected on /dependencies/operations', () => {
    renderTemplate('/dependencies/operations');

    expect(screen.getByTestId('apmDependencyDetailTab_operations')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('apmDependencyDetailTab_overview')).not.toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('marks the Operations tab as selected on /dependencies/operation (detail subpage)', () => {
    renderTemplate('/dependencies/operation');

    expect(screen.getByTestId('apmDependencyDetailTab_operations')).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('renders a back button on all tab pages', () => {
    renderTemplate('/dependencies/overview');

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toBeInTheDocument();
  });

  it('renders a back button on the operation detail subpage', () => {
    renderTemplate('/dependencies/operation');

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toBeInTheDocument();
  });

  it('renders children', () => {
    renderTemplate();

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
