/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';

import { AutocompleteField } from '../../components/autocomplete_field';
import { Toolbar } from '../../components/eui/toolbar';
import { WaffleTimeControls } from '../../components/waffle/waffle_time_controls';

import { InfraNodeType } from '../../../common/graphql/types';
import { WaffleGroupByControls } from '../../components/waffle/waffle_group_by_controls';
import { WaffleMetricControls } from '../../components/waffle/waffle_metric_controls';
import { WaffleNodeTypeSwitcher } from '../../components/waffle/waffle_node_type_switcher';
import { WithWaffleFilter } from '../../containers/waffle/with_waffle_filters';
import { WithWaffleOptions } from '../../containers/waffle/with_waffle_options';
import { WithWaffleTime } from '../../containers/waffle/with_waffle_time';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';

const TITLES = {
  [InfraNodeType.host]: 'Hosts',
  [InfraNodeType.pod]: 'Kubernetes Pods',
  [InfraNodeType.container]: 'Docker Containers',
};

export const HomeToolbar: React.SFC = () => (
  <Toolbar>
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <WithWaffleOptions>
          {({ nodeType }) => (
            <EuiTitle size="m">
              <h1>{TITLES[nodeType]}</h1>
            </EuiTitle>
          )}
        </WithWaffleOptions>
        <EuiText color="subdued">
          <p>Showing the last 1 minute of data from the time period</p>
        </EuiText>
      </EuiFlexItem>
      <WithWaffleOptions>
        {({ nodeType, changeNodeType, changeGroupBy, changeMetric }) => (
          <EuiFlexItem grow={false}>
            <WaffleNodeTypeSwitcher
              nodeType={nodeType}
              changeNodeType={changeNodeType}
              changeMetric={changeMetric}
              changeGroupBy={changeGroupBy}
            />
          </EuiFlexItem>
        )}
      </WithWaffleOptions>
    </EuiFlexGroup>
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
      <EuiFlexItem>
        <WithKueryAutocompletion>
          {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
            <WithWaffleFilter>
              {({
                applyFilterQueryFromKueryExpression,
                filterQueryDraft,
                isFilterQueryDraftValid,
                setFilterQueryDraftFromKueryExpression,
              }) => (
                <AutocompleteField
                  isLoadingSuggestions={isLoadingSuggestions}
                  isValid={isFilterQueryDraftValid}
                  loadSuggestions={loadSuggestions}
                  onChange={setFilterQueryDraftFromKueryExpression}
                  onSubmit={applyFilterQueryFromKueryExpression}
                  placeholder="Search for infrastructure data... (e.g. host.name:host-1)"
                  suggestions={suggestions}
                  value={filterQueryDraft ? filterQueryDraft.expression : ''}
                />
              )}
            </WithWaffleFilter>
          )}
        </WithKueryAutocompletion>
      </EuiFlexItem>
      <WithWaffleOptions>
        {({ changeMetric, changeGroupBy, groupBy, metric, nodeType }) => (
          <React.Fragment>
            <EuiFlexItem grow={false}>
              <WaffleMetricControls metric={metric} nodeType={nodeType} onChange={changeMetric} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <WaffleGroupByControls
                groupBy={groupBy}
                nodeType={nodeType}
                onChange={changeGroupBy}
              />
            </EuiFlexItem>
          </React.Fragment>
        )}
      </WithWaffleOptions>
      <EuiFlexItem grow={false}>
        <WithWaffleTime resetOnUnmount>
          {({ currentTime, isAutoReloading, jumpToTime, startAutoReload, stopAutoReload }) => (
            <WaffleTimeControls
              currentTime={currentTime}
              isLiveStreaming={isAutoReloading}
              onChangeTime={jumpToTime}
              startLiveStreaming={startAutoReload}
              stopLiveStreaming={stopAutoReload}
            />
          )}
        </WithWaffleTime>
      </EuiFlexItem>
    </EuiFlexGroup>
  </Toolbar>
);
