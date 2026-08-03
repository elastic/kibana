/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiIcon,
  EuiIconTip,
  EuiLoadingElastic,
  EuiSpacer,
  EuiText,
  EuiTitle,
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
            <EuiIconTip
              content={`This index does not belong to a data stream. This will most likely cause mapping issues. Consider deleting the index and re-install the APM integration to ensure you have index templates and data streams correctly installed`}
              type="warning"
            />
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
          return <EuiIconTip content={`Pipeline is missing`} type="warning" />;
        }

        return (
          <>
            {ingestPipeline.isValid ? (
              ingestPipeline.id
            ) : (
              <EuiIconTip
                content={`The expected processor for "observer.version" was not found in "${ingestPipeline.id}"`}
                type="warning"
              />
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
              <EuiIconTip
                content={`The field "service.name" should be mapped as keyword but is mapped as "${fieldMappings.invalidType}"`}
                type="warning"
              />
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
        tableCaption={i18n.translate('xpack.apm.diagnostics.indicesTab.invalidIndicesCaption', {
          defaultMessage: 'Indices with problems',
        })}
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
        tableCaption={i18n.translate('xpack.apm.diagnostics.indicesTab.validIndicesCaption', {
          defaultMessage: 'Indices without problems',
        })}
      />
    </>
  );
}
