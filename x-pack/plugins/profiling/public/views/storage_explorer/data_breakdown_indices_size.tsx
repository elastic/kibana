/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { asDynamicBytes, asInteger } from '@kbn/observability-plugin/common';
import React from 'react';
import type {
  StorageExplorerIndexNames,
  StotageExplorerDataBreakdownSize,
} from '../../../common/storage_explorer';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { LabelWithHint } from '../../components/label_with_hint';
import { getIndexLabel } from './data_breakdown_chart';

interface Props {
  data?: StotageExplorerDataBreakdownSize;
}

export function DataBreakdownIndicesSize({ data }: Props) {
  const { docLinks } = useProfilingDependencies().start.core;

  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      <EuiFlexItem grow={false}>
        <IndexSizeItem
          indexName="stackframes"
          docCount={data?.stackframes.docCount}
          sizeInBytes={data?.stackframes.sizeInBytes}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IndexSizeItem
          indexName="stacktraces"
          docCount={data?.stacktraces.docCount}
          sizeInBytes={data?.stacktraces.sizeInBytes}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IndexSizeItem
          indexName="executables"
          docCount={data?.executables.docCount}
          sizeInBytes={data?.executables.sizeInBytes}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IndexSizeItem
          indexName="metrics"
          docCount={data?.metrics.docCount}
          sizeInBytes={data?.metrics.sizeInBytes}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IndexSizeItem
          indexName="events"
          docCount={data?.events.docCount}
          sizeInBytes={data?.events.sizeInBytes}
          hint={i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.events.hint', {
            defaultMessage:
              'Events linearly correlate with the probabilistic profiling value. The lower the probabilistic profiling value, the fewer events are collected.',
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function IndexSizeItem({
  indexName,
  docCount,
  sizeInBytes,
  hint,
}: {
  indexName: StorageExplorerIndexNames;
  docCount?: number;
  sizeInBytes?: number;
  hint?: string;
}) {
  const theme = useEuiTheme();

  const indexLabel = getIndexLabel(indexName);

  return (
    <>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          {hint ? (
            <LabelWithHint
              label={indexLabel}
              hint={hint}
              labelSize="xs"
              labelStyle={{ fontWeight: 'bold' }}
            />
          ) : (
            <EuiText style={{ fontWeight: 'bold' }} size="xs">
              {indexLabel}
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText style={{ fontWeight: 'bold' }} size="xs">
            {i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.size', {
              defaultMessage: 'Size',
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup
        responsive={false}
        style={{
          backgroundColor: theme.euiTheme.colors.lightestShade,
          height: 41,
          alignItems: 'center',
          borderTop: `${theme.euiTheme.border.width.thin} solid ${theme.euiTheme.border.color}`,
          borderBottom: `${theme.euiTheme.border.width.thin} solid ${theme.euiTheme.border.color}`,
        }}
      >
        <EuiFlexItem style={{ paddingLeft: 8 }}>{docCount ? asInteger(docCount) : ''}</EuiFlexItem>
        <EuiFlexItem style={{ paddingLeft: 8 }}>
          {sizeInBytes ? asDynamicBytes(sizeInBytes) : ''}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
