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
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { useDiagnosticsContext } from './context/use_diagnostics';
import { getApmIndexTemplatePrefixes } from './helpers';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function DiagnosticsIndices() {
  const { diagnosticsBundle, status } = useDiagnosticsContext();
  const { invalidItems, validItems } = getIndicesItems(diagnosticsBundle);

  type Item = typeof validItems[0];
  const columns: Array<EuiBasicTableColumn<Item>> = [
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
        This section shows the concrete indices backing the data streams, and
        highlights mapping issues and missing ingest pipelines.
      </EuiText>

      <EuiSpacer />

      <EuiTitle size="s">
        <h3>Indices with problems</h3>
      </EuiTitle>
      <EuiBasicTable items={invalidItems} rowHeader="index" columns={columns} />

      <EuiSpacer />

      <EuiTitle size="s">
        <h3>Indices without problems</h3>
      </EuiTitle>
      <EuiBasicTable items={validItems} rowHeader="index" columns={columns} />
    </>
  );
}

export function getIndicesItems(diagnosticsBundle?: DiagnosticsBundle) {
  if (!diagnosticsBundle) {
    return { invalidItems: [], validItems: [] };
  }

  const { indices, fieldCaps, ingestPipelines } = diagnosticsBundle;
  const indicesWithPipelineId = Object.entries(indices).map(([key, value]) => ({
    index: key,
    dataStream: value.data_stream,
    pipelineId: value.settings?.index?.default_pipeline,
  }));

  const invalidFieldMappings = Object.values(
    fieldCaps.fields[SERVICE_NAME] ?? {}
  ).filter(({ type }): boolean => type !== 'keyword');

  const items = indicesWithPipelineId.map(
    ({ index, dataStream, pipelineId }) => {
      const hasObserverVersionProcessor = pipelineId
        ? ingestPipelines[pipelineId]?.processors?.some((processor) => {
            return (
              processor?.grok?.field === 'observer.version' &&
              processor?.grok?.patterns[0] ===
                '%{DIGITS:observer.version_major:int}.%{DIGITS:observer.version_minor:int}.%{DIGITS:observer.version_patch:int}(?:[-+].*)?'
            );
          })
        : false;

      const invalidFieldMapping = invalidFieldMappings.find((fieldMappings) =>
        fieldMappings.indices?.includes(index)
      );

      const isValidFieldMappings = invalidFieldMapping === undefined;
      const isValidIngestPipeline =
        hasObserverVersionProcessor === true &&
        validateIngestPipelineName(dataStream, pipelineId);

      return {
        isValid: isValidFieldMappings && isValidIngestPipeline,
        fieldMappings: {
          isValid: isValidFieldMappings,
          invalidType: invalidFieldMapping?.type,
        },
        ingestPipeline: {
          isValid: isValidIngestPipeline,
          id: pipelineId,
        },
        index,
        dataStream,
      };
    }
  );

  const invalidItems = items.filter((item) => !item.isValid);
  const validItems = items.filter((item) => item.isValid);

  return { invalidItems, validItems };
}

export function validateIngestPipelineName(
  dataStream: string | undefined,
  ingestPipelineId: string | undefined
) {
  if (!dataStream || !ingestPipelineId) {
    return false;
  }

  const indexTemplatePrefixes = getApmIndexTemplatePrefixes();
  return indexTemplatePrefixes.some(
    (prefix) =>
      dataStream.startsWith(prefix) && ingestPipelineId.startsWith(prefix)
  );
}
