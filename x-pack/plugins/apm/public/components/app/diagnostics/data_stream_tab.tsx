/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiCallOut,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { getIsValidIndexTemplateName } from '../../../../common/diagnostics/get_default_index_template_names';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useDiagnosticsReportFromSessionStorage } from './import_export_tab';

type APIResponseType =
  APIReturnType<'GET /internal/apm/diagnostics/data_streams'>;

export function DiagnosticsDataStreams() {
  const { report } = useDiagnosticsReportFromSessionStorage();

  const { data } = useFetcher(
    async (callApmApi) => {
      if (report) {
        return report.dataStream;
      }

      return callApmApi(`GET /internal/apm/diagnostics/data_streams`);
    },
    [report]
  );

  return (
    <>
      <NonDataStreamIndicesCallout data={data} />

      <EuiText>
        This section shows the APM data streams and their underlying index
        template.
      </EuiText>
      <EuiSpacer />
      <DataStreamsTable data={data} />
    </>
  );
}

function NonDataStreamIndicesCallout({ data }: { data?: APIResponseType }) {
  if (!data?.nonDataStreamIndices.length) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title="Non-data stream indices"
        color="warning"
        iconType="help"
      >
        The following indices are not backed by a data stream:{' '}
        {data?.nonDataStreamIndices.join(', ')}
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
}

function DataStreamsTable({ data }: { data?: APIResponseType }) {
  const columns: Array<EuiBasicTableColumn<IndicesDataStream>> = [
    {
      field: 'name',
      name: 'Data stream name',
    },
    {
      field: 'template',
      name: 'Index template name',
      render: (templateName: string) => {
        const isValid = getIsValidIndexTemplateName(templateName);
        return isValid ? (
          <>
            {templateName}&nbsp;<EuiBadge color="green">OK</EuiBadge>
          </>
        ) : (
          <>
            {templateName}&nbsp;
            <EuiBadge color="warning">Non-standard template</EuiBadge>
          </>
        );
      },
    },
  ];

  return (
    <EuiBasicTable
      tableCaption="Demo of EuiBasicTable"
      items={data?.dataStreams ?? []}
      rowHeader="firstName"
      columns={columns}
    />
  );
}
