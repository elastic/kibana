/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Outlet } from '@kbn/typed-react-router-config';
import React from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { DiagnosticsSummary } from './summary_tab';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';
import { DiagnosticsIndexTemplates } from './index_templates_tab';
import { DiagnosticsIndices } from './indices_tab';
import { DiagnosticsDataStreams } from './data_stream_tab';
import { DiagnosticsIndexPatternSettings } from './index_pattern_settings_tab';
import { DiagnosticsImportExport } from './import_export_tab';
import { DiagnosticsContextProvider } from './context/diagnostics_context';
import { useDiagnosticsContext } from './context/use_diagnostics';

export const diagnosticsRoute = {
  '/diagnostics': {
    element: (
      <DiagnosticsContextProvider>
        <DiagnosticsTemplate>
          <Outlet />
        </DiagnosticsTemplate>
      </DiagnosticsContextProvider>
    ),
    children: {
      '/diagnostics': {
        element: <DiagnosticsSummary />,
      },
      '/diagnostics/index-pattern-settings': {
        element: <DiagnosticsIndexPatternSettings />,
      },
      '/diagnostics/index-templates': {
        element: <DiagnosticsIndexTemplates />,
      },
      '/diagnostics/data-streams': {
        element: <DiagnosticsDataStreams />,
      },
      '/diagnostics/indices': {
        element: <DiagnosticsIndices />,
      },
      '/diagnostics/import-export': {
        element: <DiagnosticsImportExport />,
      },
    },
  },
};

function DiagnosticsTemplate({ children }: { children: React.ReactChild }) {
  const routePath = useApmRoutePath();
  const router = useApmRouter();

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
            href: router.link('/diagnostics'),
            label: i18n.translate('xpack.apm.diagnostics.tab.summary', {
              defaultMessage: 'Summary',
            }),
            isSelected: routePath === '/diagnostics',
          },
          {
            href: router.link('/diagnostics/index-pattern-settings'),
            label: i18n.translate(
              'xpack.apm.diagnostics.tab.index_pattern_settings',
              {
                defaultMessage: 'Index pattern settings',
              }
            ),
            isSelected: routePath === '/diagnostics/index-pattern-settings',
          },
          {
            href: router.link('/diagnostics/index-templates'),
            label: i18n.translate('xpack.apm.diagnostics.tab.index_templates', {
              defaultMessage: 'Index templates',
            }),
            isSelected: routePath === '/diagnostics/index-templates',
          },
          {
            href: router.link('/diagnostics/data-streams'),
            label: i18n.translate('xpack.apm.diagnostics.tab.datastreams', {
              defaultMessage: 'Data streams',
            }),
            isSelected: routePath === '/diagnostics/data-streams',
          },
          {
            href: router.link('/diagnostics/indices'),
            label: i18n.translate('xpack.apm.diagnostics.tab.indices', {
              defaultMessage: 'Indices',
            }),
            isSelected: routePath === '/diagnostics/indices',
          },
          {
            href: router.link('/diagnostics/import-export'),
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
  const { isUploaded } = useDiagnosticsContext();
  if (isUploaded) {
    return (
      <EuiCallOut
        title="Displaying results from the uploaded diagnostics report"
        iconType="exportAction"
      />
    );
  }

  return null;
}

function RefreshButton() {
  const { isUploaded, refetch } = useDiagnosticsContext();
  return (
    <EuiButton
      isDisabled={isUploaded}
      data-test-subj="apmDiagnosticsTemplateAddSomethingButton"
      fill
      onClick={refetch}
    >
      Refresh
    </EuiButton>
  );
}
