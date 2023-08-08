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
  StorageDetailsGroupedByIndex,
  StorageGroupedIndexNames,
} from '../../../../common/storage_explorer';
import { LabelWithHint } from '../../../components/label_with_hint';
import { getGroupedIndexLabel } from './utils';

interface Props {
  data?: StorageDetailsGroupedByIndex[];
}

const hintMap: Partial<Record<StorageGroupedIndexNames, string>> = {
  events: i18n.translate('xpack.profiling.storageExplorer.dataBreakdown.events.hint', {
    defaultMessage:
      'Events linearly correlate with the probabilistic profiling value. The lower the probabilistic profiling value, the fewer events are collected.',
  }),
};

export function GroupedIndexDetails({ data = [] }: Props) {
  const orderedIndexNames = [
    'stackframes',
    'stacktraces',
    'executables',
    'metrics',
    'events',
  ] as StorageGroupedIndexNames[];
  return (
    <EuiFlexGroup gutterSize="s" direction="column">
      {orderedIndexNames.map((indexName) => {
        const stats = data.find((item) => item.indexName === indexName);
        if (!stats) {
          return null;
        }
        return (
          <EuiFlexItem grow={false} key={indexName}>
            <IndexSizeItem
              indexName={indexName}
              docCount={stats.docCount}
              sizeInBytes={stats.sizeInBytes}
              hint={hintMap[indexName]}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}

function IndexSizeItem({
  indexName,
  docCount,
  sizeInBytes,
  hint,
}: {
  indexName: StorageGroupedIndexNames;
  docCount?: number;
  sizeInBytes?: number;
  hint?: string;
}) {
  const theme = useEuiTheme();

  const indexLabel = getGroupedIndexLabel(indexName);

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
