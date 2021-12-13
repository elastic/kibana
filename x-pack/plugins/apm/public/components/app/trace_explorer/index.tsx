/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiText } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  TraceSearchQuery,
  TraceSearchType,
} from '../../../../common/trace_explorer';
import {
  useTraceQuery,
  UseTraceQueryState,
} from '../../../hooks/use_trace_query';
import { ApmDatePicker } from '../../shared/apm_date_picker';
import { TraceComparison } from './trace_comparison';
import { TraceDistribution } from './trace_distribution';
import { TraceSearchBox } from './trace_search_box';

function getTraceCountMessage(traceCount?: number) {
  return traceCount === undefined
    ? ''
    : i18n.translate('xpack.apm.traceExplorer.traceCount', {
        values: { traceCount },
        defaultMessage: `Found {traceCount, plural,
      =0 {no traces... yet}
      one {# trace}
      other {# traces}
    }`,
      });
}

function getComponentProps(queryState: UseTraceQueryState) {
  return {
    query: queryState.query,
    error: !!queryState.traceSearchState?.isError,
    message:
      queryState?.traceSearchState?.error ??
      getTraceCountMessage(queryState.traceSearchState?.foundTraceCount),
    loading:
      queryState.traceSearchStateLoading ||
      !!queryState.traceSearchState?.isRunning,
    disabled: false,
    onQueryChange: (query: TraceSearchQuery) => {
      queryState.setQuery(query);
    },
    onQueryCommit: () => {
      queryState.commit();
    },
    onCancelClick: () => {
      queryState.cancel();
    },
  };
}

export function TraceExplorer() {
  const foreground = useTraceQuery({
    type: TraceSearchType.kql,
    query: '',
  });

  const background = useTraceQuery({
    type: TraceSearchType.kql,
    query: '',
  });

  const [backgroundEnabled, setBackgroundEnabled] = useState(false);

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        <EuiFlexItem style={{ alignItems: 'flex-end' }}>
          <ApmDatePicker />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="row" alignItems="flexStart">
            <EuiFlexItem grow>
              <TraceSearchBox
                {...getComponentProps(foreground)}
                title={
                  <EuiText>
                    {i18n.translate('xpack.apm.traceExplorer.searchTitle', {
                      defaultMessage: 'Search',
                    })}
                  </EuiText>
                }
              />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <TraceSearchBox
                {...getComponentProps(background)}
                title={
                  <EuiSwitch
                    checked={backgroundEnabled}
                    onChange={(e) => {
                      setBackgroundEnabled(e.target.checked);
                    }}
                    label={i18n.translate(
                      'xpack.apm.traceExplorer.compareWithCheckboxLabel',
                      {
                        defaultMessage: 'Compare with',
                      }
                    )}
                  />
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <TraceDistribution
        loading={
          !!foreground.traceSearchState?.fragments.distribution.isRunning ||
          !!background.traceSearchState?.fragments.distribution.isRunning
        }
        foregroundDistributionResponse={
          foreground.traceSearchState?.fragments.distribution.data
        }
        backgroundDistributionResponse={
          background.traceSearchState?.fragments.distribution.data
        }
      />
      <EuiSpacer size="m" />
      <TraceComparison foreground={foreground} background={background} />
    </>
  );
}
