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
import { useTraceQuery } from '../../../hooks/use_trace_query';
import { ApmDatePicker } from '../../shared/apm_date_picker';
import { TraceComparison } from './trace_comparison';
import { TraceDistribution } from './trace_distribution';
import { TraceSearchBox } from './trace_search_box';

function isQueryValid(query: TraceSearchQuery) {
  return true;
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
                query={foreground.query}
                valid={isQueryValid(foreground.query)}
                loading={
                  foreground.traceSearchStateLoading ||
                  !!foreground.traceSearchState?.isRunning
                }
                title={
                  <EuiText>
                    {i18n.translate('xpack.apm.traceExplorer.searchTitle', {
                      defaultMessage: 'Search',
                    })}
                  </EuiText>
                }
                disabled={false}
                onQueryChange={(query) => {
                  foreground.setQuery(query);
                }}
                onQueryCommit={() => {
                  foreground.commit();
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <TraceSearchBox
                query={background.query}
                valid={isQueryValid(background.query)}
                disabled={!backgroundEnabled}
                loading={
                  background.traceSearchStateLoading ||
                  !!background.traceSearchState?.isRunning
                }
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
                onQueryChange={(query) => {
                  background.setQuery(query);
                }}
                onQueryCommit={() => {
                  background.commit();
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <TraceDistribution
        loading={
          (!!foreground.query.query &&
            foreground.traceSearchState?.fragments.distribution.isRunning !==
              false) ||
          (!!background.query.query &&
            background.traceSearchState?.fragments.distribution.isRunning !==
              false)
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
