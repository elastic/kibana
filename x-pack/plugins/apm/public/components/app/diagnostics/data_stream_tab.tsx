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
import { useDiagnosticsContext } from './context/use_diagnostics';
import { getIsValidIndexTemplateName } from './helpers';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function DiagnosticsDataStreams() {
  const { diagnosticsBundle, status } = useDiagnosticsContext();

  return (
    <>
      <NonDataStreamIndicesCallout data={diagnosticsBundle} />

      <EuiText>
        This section shows the APM data streams and their underlying index
        template.
      </EuiText>
      <EuiSpacer />
      <DataStreamsTable data={diagnosticsBundle} />
    </>
  );
}

function NonDataStreamIndicesCallout({ data }: { data?: DiagnosticsBundle }) {
  if (!data?.nonDataStreamIndices.length) {
    return null;
  }

  return (
    <>
      <EuiCallOut title="Legacy indices" color="warning" iconType="warning">
        The following indices are not backed by a data stream and should
        possibly be deleted:{' '}
        {data?.nonDataStreamIndices.map((name) => (
          <EuiBadge>{name}</EuiBadge>
        ))}
      </EuiCallOut>
      <EuiSpacer />
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
