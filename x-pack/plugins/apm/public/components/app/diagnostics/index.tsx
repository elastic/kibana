/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Outlet } from '@kbn/typed-react-router-config';
import React from 'react';
import * as t from 'io-ts';
import { EuiButton, EuiCallOut, EuiIcon } from '@elastic/eui';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { DiagnosticsSummary } from './summary_tab';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';
import { DiagnosticsIndexTemplates } from './index_templates_tab';
import { DiagnosticsIndices } from './indices_tab';
import { DiagnosticsDataStreams } from './data_stream_tab';
import {
  DiagnosticsIndexPatternSettings,
  getIndexPatternTabStatus,
} from './index_pattern_settings_tab';
import { DiagnosticsImportExport } from './import_export_tab';
import { DiagnosticsContextProvider } from './context/diagnostics_context';
import { useDiagnosticsContext } from './context/use_diagnostics';
import { getIndexTemplateStatus } from './summary_tab/index_templates_status';
import { getDataStreamTabStatus } from './summary_tab/data_streams_status';
import { getIndicesTabStatus } from './summary_tab/indicies_status';
import { DiagnosticsApmDocuments } from './apm_documents_tab';

const params = t.type({
  query: t.intersection([
    t.type({
      rangeFrom: t.string,
      rangeTo: t.string,
    }),
    t.partial({
      refreshPaused: t.union([t.literal('true'), t.literal('false')]),
      refreshInterval: t.string,
      kuery: t.string,
    }),
  ]),
});

export const diagnosticsRoute = {
  '/diagnostics': {
    element: (
      <DiagnosticsContextProvider>
        <DiagnosticsTemplate>
          <Outlet />
        </DiagnosticsTemplate>
      </DiagnosticsContextProvider>
    ),
    params,
    children: {
      '/diagnostics': {
        element: <DiagnosticsSummary />,
        params,
      },
      '/diagnostics/index-pattern-settings': {
        element: <DiagnosticsIndexPatternSettings />,
        params,
      },
      '/diagnostics/index-templates': {
        element: <DiagnosticsIndexTemplates />,
        params,
      },
      '/diagnostics/data-streams': {
        element: <DiagnosticsDataStreams />,
        params,
      },
      '/diagnostics/indices': {
        element: <DiagnosticsIndices />,
        params,
      },
      '/diagnostics/documents': {
        element: <DiagnosticsApmDocuments />,
        params,
      },
      '/diagnostics/import-export': {
        element: <DiagnosticsImportExport />,
        params,
      },
    },
  },
};

function DiagnosticsTemplate({ children }: { children: React.ReactChild }) {
  const routePath = useApmRoutePath();
  const router = useApmRouter();
  const { diagnosticsBundle } = useDiagnosticsContext();
  const { query } = useApmParams('/diagnostics/*');

  return (
    <ApmMainTemplate
      pageTitle="Diagnostics"
      environmentFilter={false}
      showServiceGroupSaveButton={false}
      selectedNavButton="serviceGroups"
      pageHeader={{
        iconType: 'magnifyWithExclamation',
        rightSideItems: [<RefreshButton />],
        description: <TemplateDescription />,
        tabs: [
          {
            'data-test-subj': 'summary-tab',
            href: router.link('/diagnostics', { query }),
            label: i18n.translate('xpack.apm.diagnostics.tab.summary', {
              defaultMessage: 'Summary',
            }),
            isSelected: routePath === '/diagnostics',
          },
          {
            'data-test-subj': 'index-pattern-tab',
            prepend: !getIndexPatternTabStatus(diagnosticsBundle) && (
              <EuiIcon type="warning" color="red" />
            ),
            href: router.link('/diagnostics/index-pattern-settings', { query }),
            label: i18n.translate(
              'xpack.apm.diagnostics.tab.index_pattern_settings',
              {
                defaultMessage: 'Index pattern settings',
              }
            ),
            isSelected: routePath === '/diagnostics/index-pattern-settings',
          },
          {
            'data-test-subj': 'index-templates-tab',
            prepend: !getIndexTemplateStatus(diagnosticsBundle) && (
              <EuiIcon type="warning" color="red" />
            ),
            href: router.link('/diagnostics/index-templates', { query }),
            label: i18n.translate('xpack.apm.diagnostics.tab.index_templates', {
              defaultMessage: 'Index templates',
            }),
            isSelected: routePath === '/diagnostics/index-templates',
          },
          {
            'data-test-subj': 'data-streams-tab',
            prepend: !getDataStreamTabStatus(diagnosticsBundle) && (
              <EuiIcon type="warning" color="red" />
            ),
            href: router.link('/diagnostics/data-streams', { query }),
            label: i18n.translate('xpack.apm.diagnostics.tab.datastreams', {
              defaultMessage: 'Data streams',
            }),
            isSelected: routePath === '/diagnostics/data-streams',
          },
          {
            'data-test-subj': 'indices-tab',
            prepend: !getIndicesTabStatus(diagnosticsBundle) && (
              <EuiIcon type="warning" color="red" />
            ),
            href: router.link('/diagnostics/indices', { query }),
            label: i18n.translate('xpack.apm.diagnostics.tab.indices', {
              defaultMessage: 'Indices',
            }),
            isSelected: routePath === '/diagnostics/indices',
          },
          {
            'data-test-subj': 'documents-tab',
            href: router.link('/diagnostics/documents', { query }),
            label: i18n.translate('xpack.apm.diagnostics.tab.apmEvents', {
              defaultMessage: 'Documents',
            }),
            isSelected: routePath === '/diagnostics/documents',
          },
          {
            'data-test-subj': 'import-export-tab',
            href: router.link('/diagnostics/import-export', { query }),
            label: i18n.translate('xpack.apm.diagnostics.tab.import_export', {
              defaultMessage: 'Import/Export',
            }),
            isSelected: routePath === '/diagnostics/import-export',
          },
        ],
      }}
    >
      {children}
    </ApmMainTemplate>
  );
}

function TemplateDescription() {
  const { isImported, setImportedDiagnosticsBundle } = useDiagnosticsContext();
  if (isImported) {
    return (
      <EuiCallOut
        title="Displaying results from the uploaded diagnostics report"
        iconType="exportAction"
      >
        <EuiButton
          data-test-subj="apmTemplateDescriptionClearBundleButton"
          onClick={() => setImportedDiagnosticsBundle(undefined)}
        >
          Clear bundle
        </EuiButton>
      </EuiCallOut>
    );
  }

  return null;
}

function RefreshButton() {
  const { isImported, refetch } = useDiagnosticsContext();
  return (
    <EuiButton
      isDisabled={isImported}
      data-test-subj="apmDiagnosticsTemplateRefreshButton"
      fill
      onClick={refetch}
    >
      Refresh
    </EuiButton>
  );
}
