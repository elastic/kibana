/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiIcon,
  EuiLoadingElastic,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { type IndiciesItem } from '../../../../server/routes/diagnostics/route';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useDiagnosticsContext } from './context/use_diagnostics';

export function DiagnosticsIndices() {
  const { diagnosticsBundle, status } = useDiagnosticsContext();

  if (!diagnosticsBundle || status === FETCH_STATUS.LOADING) {
    return <EuiLoadingElastic size="m" />;
  }

  const { invalidIndices = [], validIndices = [] } = diagnosticsBundle;
  const columns: Array<EuiBasicTableColumn<IndiciesItem>> = [
    {
      field: 'index',
      name: 'Index name',
      truncateText: true,
    },
    {
      field: 'dataStream',
      name: 'Data stream',
      truncateText: true,
      render: (_, { dataStream }) => {
        if (!dataStream) {
          return (
            <EuiToolTip
              content={`This index does not belong to a data stream. This will most likely cause mapping issues. Consider deleting the index and re-install the APM integration to ensure you have index templates and data streams correctly installed`}
            >
              <EuiIcon type="warning" />
            </EuiToolTip>
          );
        }

        return dataStream;
      },
    },
    {
      field: 'ingestPipeline',
      name: 'Ingest pipelines',
      truncateText: true,
      render: (_, { ingestPipeline }) => {
        if (ingestPipeline.id === undefined) {
          return (
            <EuiToolTip content={`Pipeline is missing`}>
              <EuiIcon type="warning" />
            </EuiToolTip>
          );
        }

        return (
          <>
            {ingestPipeline.isValid ? (
              ingestPipeline.id
            ) : (
              <EuiToolTip
                content={`The expected processor for "observer.version" was not found in "${ingestPipeline.id}"`}
              >
                <EuiIcon type="warning" />
              </EuiToolTip>
            )}
          </>
        );
      },
    },
    {
      field: 'fieldMappings',
      name: 'Mappings',
      width: '75px',
      align: 'center',
      render: (_, { fieldMappings }) => {
        return (
          <>
            {fieldMappings.isValid ? (
              <EuiIcon type="check" />
            ) : (
              <EuiToolTip
                content={`The field "service.name" should be mapped as keyword but is mapped as "${fieldMappings.invalidType}"`}
              >
                <EuiIcon type="warning" />
              </EuiToolTip>
            )}
          </>
        );
      },
    },
  ];

  return (
    <>
      <EuiText>
        This section shows the concrete indices backing the data streams, and highlights mapping
        issues and missing ingest pipelines.
      </EuiText>

      <EuiSpacer />

      <EuiTitle size="s">
        <h3>Indices with problems</h3>
      </EuiTitle>
      <EuiBasicTable
        data-test-subj="indicedWithProblems"
        items={invalidIndices}
        rowHeader="index"
        columns={columns}
      />

      <EuiSpacer />

      <EuiTitle size="s">
        <h3>Indices without problems</h3>
      </EuiTitle>
      <EuiBasicTable
        data-test-subj="indicedWithoutProblems"
        items={validIndices}
        rowHeader="index"
        columns={columns}
      />
    </>
  );
}
