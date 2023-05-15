/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Outlet } from '@kbn/typed-react-router-config';
import React from 'react';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { DiagnosticsSummary } from './summary_tab';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';
import { DiagnosticsIndexTemplates } from './index_templates_tab';
import { DiagnosticsInvalidFieldMappings } from './invalid_field_mappings_tab';
import { DiagnosticsDataStreams } from './data_stream_tab';

export const diagnosticsRoute = {
  '/diagnostics': {
    element: (
      <DiagnosticsTemplate>
        <Outlet />
      </DiagnosticsTemplate>
    ),
    children: {
      '/diagnostics': {
        element: <DiagnosticsSummary />,
      },
      '/diagnostics/index-templates': {
        element: <DiagnosticsIndexTemplates />,
      },
      '/diagnostics/invalid-field-mappings': {
        element: <DiagnosticsInvalidFieldMappings />,
      },
      '/diagnostics/data_streams': {
        element: <DiagnosticsDataStreams />,
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
        tabs: [
          {
            href: router.link('/diagnostics'),
            label: i18n.translate('xpack.apm.diagnostics.tab.summary', {
              defaultMessage: 'Summary',
            }),
            isSelected: routePath === '/diagnostics',
          },
          {
            href: router.link('/diagnostics/index-templates'),
            label: i18n.translate('xpack.apm.diagnostics.tab.index_templates', {
              defaultMessage: 'Index templates',
            }),
            isSelected: routePath === '/diagnostics/index-templates',
          },
          {
            href: router.link('/diagnostics/data_streams'),
            label: i18n.translate('xpack.apm.diagnostics.tab.datastreams', {
              defaultMessage: 'Data streams',
            }),
            isSelected: routePath === '/diagnostics/data_streams',
          },
          {
            href: router.link('/diagnostics/invalid-field-mappings'),
            label: i18n.translate('xpack.apm.diagnostics.tab.field_mappings', {
              defaultMessage: 'Field mappings',
            }),
            isSelected: routePath === '/diagnostics/invalid-field-mappings',
          },
        ],
      }}
    >
      {children}
    </ApmMainTemplate>
  );
}
