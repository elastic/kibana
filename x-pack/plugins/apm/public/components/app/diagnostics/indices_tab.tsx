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
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { useFetcher } from '../../../hooks/use_fetcher';

export function DiagnosticsIndices() {
  const { data } = useFetcher((callApmApi) => {
    return callApmApi(`GET /internal/apm/diagnostics/indices`);
  }, []);

  const items = data?.validItems ?? [];
  type Item = typeof items[0];
  const columns: Array<EuiBasicTableColumn<Item>> = [
    {
      field: 'index',
      name: 'Index name',
    },
    {
      field: 'dataStream',
      name: 'Data stream',
    },
    {
      field: 'fieldMappings',
      name: 'Field mappings',
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
    {
      field: 'ingestPipeline',
      name: 'Ingest pipelines',
      render: (_, { ingestPipeline }) => {
        return (
          <EuiToolTip
            content={
              ingestPipeline.isValid
                ? `Pipeline: ${ingestPipeline.id}`
                : `The expected processor for "observer.version" was not found in "${ingestPipeline.id}"`
            }
          >
            <>
              {ingestPipeline.isValid ? (
                <EuiIcon type="check" />
              ) : (
                <EuiIcon type="warning" />
              )}
              {ingestPipeline.id === undefined && <em>None</em>}
            </>
          </EuiToolTip>
        );
      },
    },
  ];

  return (
    <>
      <EuiText>
        This section shows the concrete indices backing the data streams, and
        highlights mapping issues and missing ingest pipelines.
      </EuiText>

      <EuiSpacer />

      <EuiTitle size="s">
        <h3>Indices with problems</h3>
      </EuiTitle>
      <EuiBasicTable
        items={data?.invalidItems ?? []}
        rowHeader="index"
        columns={columns}
      />

      <EuiSpacer />

      <EuiTitle size="s">
        <h3>Indices without problems</h3>
      </EuiTitle>
      <EuiBasicTable
        items={data?.validItems ?? []}
        rowHeader="index"
        columns={columns}
      />
    </>
  );
}
