/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
// import { i18n } from '@kbn/i18n';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import React from 'react';

import { AutocompleteField } from '../../components/autocomplete_field';
import { Toolbar } from '../../components/eui/toolbar';
import { SourceConfigurationButton } from '../../components/source_configuration';
import { WaffleGroupByControls } from '../../components/waffle/waffle_group_by_controls';
import { WaffleMetricControls } from '../../components/waffle/waffle_metric_controls';
import { WaffleNodeTypeSwitcher } from '../../components/waffle/waffle_node_type_switcher';
import { WaffleTimeControls } from '../../components/waffle/waffle_time_controls';
import { WithWaffleFilter } from '../../containers/waffle/with_waffle_filters';
import { WithWaffleOptions } from '../../containers/waffle/with_waffle_options';
import { WithWaffleTime } from '../../containers/waffle/with_waffle_time';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';
import { WithSource } from '../../containers/with_source';
import { InfraNodeType } from '../../graphql/types';

const getTitle = (nodeType: string) => {
  const TITLES = {
    [InfraNodeType.host as string]: (
      <FormattedMessage id="xpack.infra.homePage.toolbar.hostsTitle" defaultMessage="Hosts" />
    ),
    [InfraNodeType.pod as string]: (
      <FormattedMessage
        id="xpack.infra.homePage.toolbar.kubernetesPodsTitle"
        defaultMessage="Kubernetes Pods"
      />
    ),
    [InfraNodeType.container as string]: (
      <FormattedMessage
        id="xpack.infra.homePage.toolbar.dockerContainersTitle"
        defaultMessage="Docker Containers"
      />
    ),
  };
  return TITLES[nodeType];
};

export const HomeToolbar = injectI18n(({ intl }) => (
  <Toolbar>
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <WithWaffleOptions>
              {({ nodeType }) => (
                <EuiTitle size="m">
                  <h1>{getTitle(nodeType)}</h1>
                </EuiTitle>
              )}
            </WithWaffleOptions>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SourceConfigurationButton />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.infra.homePage.toolbar.showingLastOneMinuteDataText"
              defaultMessage="Showing the last 1 minute of data from the time period"
            />
          </p>
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
                    />
                  )}
                </WithWaffleFilter>
              )}
            </WithKueryAutocompletion>
          )}
        </WithSource>
      </EuiFlexItem>
      <WithSource>
        {({ derivedIndexPattern }) => (
          <WithWaffleOptions>
            {({
              changeMetric,
              changeGroupBy,
              changeCustomOptions,
              customOptions,
              groupBy,
              metric,
              nodeType,
            }) => (
              <React.Fragment>
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
              </React.Fragment>
            )}
          </WithWaffleOptions>
        )}
      </WithSource>
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
));
