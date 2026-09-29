/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS, AppHeader as MockAppHeaderComponent } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { ApmMainTemplateHeaderProps } from '../../routing/templates/apm_main_template';
import { DiagnosticsTemplate } from '.';

const mockLink = vi.fn((path: string) => `/link${path}`);

vi.mock('../../../hooks/use_apm_router', () => {
  const mocked = {
    useApmRouter: () => ({ link: mockLink }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_apm_params', () => {
  const mocked = {
    useApmParams: () => ({ query: { rangeFrom: 'now-15m', rangeTo: 'now' } }),
  };
  return { ...mocked, default: mocked };
});

const mockRoutePath = { current: '/diagnostics' };
vi.mock('../../../hooks/use_apm_route_path', () => {
  const mocked = {
    useApmRoutePath: () => mockRoutePath.current,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_fetcher', () => {
  const mocked = {
    isPending: (status: string) => status === 'loading',
  };
  return { ...mocked, default: mocked };
});

// Configurable context so individual tests can toggle loading/imported state and tab statuses.
const mockDiagnosticsContext = {
  diagnosticsBundle: undefined as unknown,
  status: 'success',
  isImported: false,
  refetch: vi.fn(),
  setImportedDiagnosticsBundle: vi.fn(),
};

vi.mock('./context/use_diagnostics', () => {
  const mocked = {
    useDiagnosticsContext: () => mockDiagnosticsContext,
  };
  return { ...mocked, default: mocked };
});

// Tab status helpers are configurable per test; tab components are stubbed out to keep the
// module graph light (only the template itself is under test).
const mockTabStatuses = {
  isCrossCluster: false,
  indexPatternOk: true,
  indexTemplateOk: true,
  dataStreamOk: true,
  indicesOk: true,
};

vi.mock('./summary_tab', () => {
  const mocked = {
    DiagnosticsSummary: () => null,
    getIsCrossCluster: () => mockTabStatuses.isCrossCluster,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./index_pattern_settings_tab', () => {
  const mocked = {
    DiagnosticsIndexPatternSettings: () => null,
    getIsIndexPatternTabOk: () => mockTabStatuses.indexPatternOk,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./summary_tab/index_templates_status', () => {
  const mocked = {
    getIsIndexTemplateOk: () => mockTabStatuses.indexTemplateOk,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./summary_tab/data_streams_status', () => {
  const mocked = {
    getIsDataStreamTabOk: () => mockTabStatuses.dataStreamOk,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./summary_tab/indicies_status', () => {
  const mocked = {
    getIsIndicesTabOk: () => mockTabStatuses.indicesOk,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./index_templates_tab', () => {
  const mocked = { DiagnosticsIndexTemplates: () => null };
  return { ...mocked, default: mocked };
});
vi.mock('./indices_tab', () => {
  const mocked = { DiagnosticsIndices: () => null };
  return { ...mocked, default: mocked };
});
vi.mock('./data_stream_tab', () => {
  const mocked = { DiagnosticsDataStreams: () => null };
  return { ...mocked, default: mocked };
});
vi.mock('./import_export_tab', () => {
  const mocked = { DiagnosticsImportExport: () => null };
  return { ...mocked, default: mocked };
});
vi.mock('./apm_documents_tab', () => {
  const mocked = { DiagnosticsApmDocuments: () => null };
  return { ...mocked, default: mocked };
});
vi.mock('./context/diagnostics_context', () => {
  const mocked = {
    DiagnosticsContextProvider: ({ children }: { children: React.ReactNode }) => children,
  };
  return { ...mocked, default: mocked };
});

// Render ApmMainTemplate as a thin wrapper that passes `header` straight into a real AppHeader
// (so we exercise the full tab/menu-building logic without the template's own dependencies).
vi.mock('../../routing/templates/apm_main_template', () => {
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
    vi.clearAllMocks();
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
