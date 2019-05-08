/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import React from 'react';

import { AutocompleteField } from '../../../components/autocomplete_field';
import { Toolbar } from '../../../components/eui/toolbar';
import { SourceConfigurationButton } from '../../../components/source_configuration';
import { WaffleGroupByControls } from '../../../components/waffle/waffle_group_by_controls';
import { WaffleMetricControls } from '../../../components/waffle/waffle_metric_controls';
import { WaffleNodeTypeSwitcher } from '../../../components/waffle/waffle_node_type_switcher';
import { WaffleTimeControls } from '../../../components/waffle/waffle_time_controls';
import { WithWaffleFilter } from '../../../containers/waffle/with_waffle_filters';
import { WithWaffleOptions } from '../../../containers/waffle/with_waffle_options';
import { WithWaffleTime } from '../../../containers/waffle/with_waffle_time';
import { WithKueryAutocompletion } from '../../../containers/with_kuery_autocompletion';
import { WithSource } from '../../../containers/with_source';

export const SnapshotToolbar = injectI18n(({ intl }) => (
  <Toolbar>
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
      <EuiFlexItem>
        <WithSource>
          {({ derivedIndexPattern }) => (
            <WithKueryAutocompletion indexPattern={derivedIndexPattern}>
              {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
                <WithWaffleFilter indexPattern={derivedIndexPattern}>
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
                      placeholder={intl.formatMessage({
                        id: 'xpack.infra.homePage.toolbar.kqlSearchFieldPlaceholder',
                        defaultMessage: 'Search for infrastructure data… (e.g. host.name:host-1)',
                      })}
                      suggestions={suggestions}
                      value={filterQueryDraft ? filterQueryDraft.expression : ''}
                      autoFocus={true}
                    />
                  )}
                </WithWaffleFilter>
              )}
            </WithKueryAutocompletion>
          )}
        </WithSource>
      </EuiFlexItem>
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
    <EuiFlexGroup alignItems="center" gutterSize="m">
      <WithSource>
        {({ derivedIndexPattern }) => (
          <WithWaffleOptions>
            {({
              changeMetric,
              changeNodeType,
              changeGroupBy,
              changeCustomOptions,
              customOptions,
              groupBy,
              metric,
              nodeType,
            }) => (
              <React.Fragment>
                <EuiFlexItem grow={false}>
                  <WaffleNodeTypeSwitcher
                    nodeType={nodeType}
                    changeNodeType={changeNodeType}
                    changeMetric={changeMetric}
                    changeGroupBy={changeGroupBy}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <WaffleMetricControls
                    metric={metric}
                    nodeType={nodeType}
                    onChange={changeMetric}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <WaffleGroupByControls
                    groupBy={groupBy}
                    nodeType={nodeType}
                    onChange={changeGroupBy}
                    fields={derivedIndexPattern.fields}
                    onChangeCustomOptions={changeCustomOptions}
                    customOptions={customOptions}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <SourceConfigurationButton />
                </EuiFlexItem>
              </React.Fragment>
            )}
          </WithWaffleOptions>
        )}
      </WithSource>
    </EuiFlexGroup>
  </Toolbar>
));
