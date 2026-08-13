/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS, AppHeader as MockAppHeaderComponent } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { ApmMainTemplateHeaderProps } from '../../routing/templates/apm_main_template';
import { DiagnosticsTemplate } from '.';

const mockLink = jest.fn((path: string) => `/link${path}`);

jest.mock('../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({ link: mockLink }),
}));

jest.mock('../../../hooks/use_apm_params', () => ({
  useApmParams: () => ({ query: { rangeFrom: 'now-15m', rangeTo: 'now' } }),
}));

const mockRoutePath = { current: '/diagnostics' };
jest.mock('../../../hooks/use_apm_route_path', () => ({
  useApmRoutePath: () => mockRoutePath.current,
}));

jest.mock('../../../hooks/use_fetcher', () => ({
  isPending: (status: string) => status === 'loading',
}));

// Configurable context so individual tests can toggle loading/imported state and tab statuses.
const mockDiagnosticsContext = {
  diagnosticsBundle: undefined as unknown,
  status: 'success',
  isImported: false,
  refetch: jest.fn(),
  setImportedDiagnosticsBundle: jest.fn(),
};

jest.mock('./context/use_diagnostics', () => ({
  useDiagnosticsContext: () => mockDiagnosticsContext,
}));

// Tab status helpers are configurable per test; tab components are stubbed out to keep the
// module graph light (only the template itself is under test).
const mockTabStatuses = {
  isCrossCluster: false,
  indexPatternOk: true,
  indexTemplateOk: true,
  dataStreamOk: true,
  indicesOk: true,
};

jest.mock('./summary_tab', () => ({
  DiagnosticsSummary: () => null,
  getIsCrossCluster: () => mockTabStatuses.isCrossCluster,
}));
jest.mock('./index_pattern_settings_tab', () => ({
  DiagnosticsIndexPatternSettings: () => null,
  getIsIndexPatternTabOk: () => mockTabStatuses.indexPatternOk,
}));
jest.mock('./summary_tab/index_templates_status', () => ({
  getIsIndexTemplateOk: () => mockTabStatuses.indexTemplateOk,
}));
jest.mock('./summary_tab/data_streams_status', () => ({
  getIsDataStreamTabOk: () => mockTabStatuses.dataStreamOk,
}));
jest.mock('./summary_tab/indicies_status', () => ({
  getIsIndicesTabOk: () => mockTabStatuses.indicesOk,
}));
jest.mock('./index_templates_tab', () => ({ DiagnosticsIndexTemplates: () => null }));
jest.mock('./indices_tab', () => ({ DiagnosticsIndices: () => null }));
jest.mock('./data_stream_tab', () => ({ DiagnosticsDataStreams: () => null }));
jest.mock('./import_export_tab', () => ({ DiagnosticsImportExport: () => null }));
jest.mock('./apm_documents_tab', () => ({ DiagnosticsApmDocuments: () => null }));
jest.mock('./context/diagnostics_context', () => ({
  DiagnosticsContextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Render ApmMainTemplate as a thin wrapper that passes `header` straight into a real AppHeader
// (so we exercise the full tab/menu-building logic without the template's own dependencies).
jest.mock('../../routing/templates/apm_main_template', () => ({
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
}));

const ALL_TAB_TEST_SUBJECTS = [
  'summary-tab',
  'index-pattern-tab',
  'index-templates-tab',
  'data-streams-tab',
  'indices-tab',
  'documents-tab',
  'import-export-tab',
];

function renderTemplate() {
  return render(
    <MockAppHeaderProvider>
      <DiagnosticsTemplate>
        <div data-test-subj="content">page content</div>
      </DiagnosticsTemplate>
    </MockAppHeaderProvider>
  );
}

describe('DiagnosticsTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoutePath.current = '/diagnostics';
    mockDiagnosticsContext.diagnosticsBundle = undefined;
    mockDiagnosticsContext.status = 'success';
    mockDiagnosticsContext.isImported = false;
    mockTabStatuses.isCrossCluster = false;
    mockTabStatuses.indexPatternOk = true;
    mockTabStatuses.indexTemplateOk = true;
    mockTabStatuses.dataStreamOk = true;
    mockTabStatuses.indicesOk = true;
  });

  it('renders AppHeader with title "Diagnostics"', () => {
    renderTemplate();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Diagnostics');
  });

  it('does not render a back button (Diagnostics is a top-level route)', () => {
    renderTemplate();

    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
  });

  it('renders children', () => {
    renderTemplate();

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders a loading prompt instead of the template while the bundle is loading', () => {
    mockDiagnosticsContext.status = 'loading';
    renderTemplate();

    expect(screen.getByText('Loading diagnostics')).toBeInTheDocument();
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.title)).not.toBeInTheDocument();
  });

  describe('tabs', () => {
    it('renders all tabs with their test subjects', () => {
      renderTemplate();

      ALL_TAB_TEST_SUBJECTS.forEach((testSubj) => {
        expect(screen.getByTestId(testSubj)).toBeInTheDocument();
      });
    });

    it('marks the tab matching the route path as selected', () => {
      mockRoutePath.current = '/diagnostics/documents';
      renderTemplate();

      expect(screen.getByTestId('documents-tab')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('summary-tab')).not.toHaveAttribute('aria-selected', 'true');
    });

    it('hides privileged tabs for cross-cluster bundles', () => {
      mockTabStatuses.isCrossCluster = true;
      renderTemplate();

      expect(screen.queryByTestId('index-pattern-tab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('index-templates-tab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('data-streams-tab')).not.toBeInTheDocument();
      expect(screen.queryByTestId('indices-tab')).not.toBeInTheDocument();
      expect(screen.getByTestId('summary-tab')).toBeInTheDocument();
      expect(screen.getByTestId('documents-tab')).toBeInTheDocument();
      expect(screen.getByTestId('import-export-tab')).toBeInTheDocument();
    });

    it('hides privileged tabs without cluster privileges', () => {
      mockDiagnosticsContext.diagnosticsBundle = {
        diagnosticsPrivileges: { hasAllClusterPrivileges: false },
      };
      renderTemplate();

      expect(screen.queryByTestId('index-pattern-tab')).not.toBeInTheDocument();
      expect(screen.getByTestId('summary-tab')).toBeInTheDocument();
    });

    it('shows a warning badge on tabs reporting issues', () => {
      mockTabStatuses.indexTemplateOk = false;
      renderTemplate();

      expect(
        screen.getByTestId('index-templates-tab').querySelector('[data-euiicon-type="warning"]')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('indices-tab').querySelector('[data-euiicon-type="warning"]')
      ).not.toBeInTheDocument();
    });
  });

  describe('refresh action', () => {
    it('renders the Refresh menu action and triggers refetch on click', () => {
      renderTemplate();

      const refreshButton = screen.getByTestId('apmDiagnosticsTemplateRefreshButton');
      fireEvent.click(refreshButton);
      expect(mockDiagnosticsContext.refetch).toHaveBeenCalled();
    });

    it('disables Refresh while an imported bundle is displayed', () => {
      mockDiagnosticsContext.isImported = true;
      renderTemplate();

      expect(screen.getByTestId('apmDiagnosticsTemplateRefreshButton')).toBeDisabled();
    });
  });

  describe('imported-bundle callout', () => {
    it('renders the callout with the Clear bundle button when a bundle is imported', () => {
      mockDiagnosticsContext.isImported = true;
      renderTemplate();

      const clearButton = screen.getAllByTestId('apmTemplateDescriptionClearBundleButton')[0];
      fireEvent.click(clearButton);
      expect(mockDiagnosticsContext.setImportedDiagnosticsBundle).toHaveBeenCalledWith(undefined);
    });

    it('does not render the callout without an imported bundle', () => {
      renderTemplate();

      expect(
        screen.queryByTestId('apmTemplateDescriptionClearBundleButton')
      ).not.toBeInTheDocument();
    });
  });
});
