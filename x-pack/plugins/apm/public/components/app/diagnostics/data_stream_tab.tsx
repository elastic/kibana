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
} from '@elastic/eui';
import React from 'react';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { getIsValidIndexTemplateName } from '../../../../common/diagnostics/get_default_index_template_names';
import { useFetcher } from '../../../hooks/use_fetcher';

type APIResponseType =
  APIReturnType<'GET /internal/apm/diagnostics/data_streams'>;

export function DiagnosticsDataStreams() {
  const { data } = useFetcher((callApmApi) => {
    return callApmApi(`GET /internal/apm/diagnostics/data_streams`);
  }, []);

  return (
    <>
      <NonDataStreamIndicesCallout data={data} />
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
    <EuiCallOut title="Non-data stream indices" color="warning" iconType="help">
      The following indices are not backed by a data stream:{' '}
      {data?.nonDataStreamIndices.join(', ')}
    </EuiCallOut>
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
      name: 'Template name',
      render: (templateName: string) => {
        const isValid = getIsValidIndexTemplateName(templateName);
        return isValid ? (
          <>
            <EuiBadge color="green">OK</EuiBadge>&nbsp;{templateName}
          </>
        ) : (
          <>
            <EuiBadge color="warning">Non-standard template name!</EuiBadge>
            &nbsp;
            {templateName}
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
