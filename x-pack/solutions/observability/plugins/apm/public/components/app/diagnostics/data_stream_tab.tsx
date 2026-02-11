/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBadge, EuiBasicTable, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { useDiagnosticsContext } from './context/use_diagnostics';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function DiagnosticsDataStreams() {
  const { diagnosticsBundle } = useDiagnosticsContext();

  return (
    <>
      <EuiText>
        This section shows the APM data streams and their underlying index template.
      </EuiText>
      <EuiSpacer />
      <DataStreamsTable data={diagnosticsBundle} />
    </>
  );
}

function DataStreamsTable({ data }: { data?: DiagnosticsBundle }) {
  const columns: Array<EuiBasicTableColumn<IndicesDataStream>> = [
    {
      field: 'name',
      name: 'Data stream name',
    },
    {
      field: 'template',
      name: 'Index template name',
      render: (templateName: string) => {
        const indexTemplate = data && getIndexTemplateState(data, templateName);

        return indexTemplate?.exists && !indexTemplate?.isNonStandard ? (
          <>
            {templateName}&nbsp;
            <EuiBadge color="green">OK</EuiBadge>
          </>
        ) : (
          <>
            {templateName}&nbsp;
            <EuiBadge color="warning">Non-standard</EuiBadge>
          </>
        );
      },
    },
  ];

  return (
    <EuiBasicTable
      items={data?.dataStreams ?? []}
      rowHeader="firstName"
      columns={columns}
      tableCaption={i18n.translate('xpack.apm.diagnostics.dataStreamTab.dataStreams', {
        defaultMessage: 'Diagnostics data streams',
      })}
    />
  );
}

export function getIndexTemplateState(diagnosticsBundle: DiagnosticsBundle, templateName: string) {
  return diagnosticsBundle.apmIndexTemplates.find(({ name }) => templateName === name);
}
