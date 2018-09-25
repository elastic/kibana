/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { AutocompleteField } from '../components/autocomplete_field';
import { Toolbar } from '../components/eui/toolbar';
import { Header } from '../components/header';
import { ColumnarPage, PageContent } from '../components/page';
import { Waffle } from '../components/waffle';
import { WaffleTimeControls } from '../components/waffle/waffle_time_controls';

import { EmptyPage } from '../components/empty_page';
import {
  WithWaffleFilter,
  WithWaffleFilterUrlState,
} from '../containers/waffle/with_waffle_filters';
import { WithWaffleNodes } from '../containers/waffle/with_waffle_nodes';
import { WithWaffleTime, WithWaffleTimeUrlState } from '../containers/waffle/with_waffle_time';
import { WithKibanaChrome } from '../containers/with_kibana_chrome';
import { WithKueryAutocompletion } from '../containers/with_kuery_autocompletion';
import { WithOptions } from '../containers/with_options';
import { WithSource } from '../containers/with_source';

export class HomePage extends React.PureComponent {
  public render() {
    return (
      <ColumnarPage>
<<<<<<< HEAD
        <WithWaffleTimeUrlState />
        <WithWaffleFilterUrlState />
        <Header />
        <Toolbar>
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
            <EuiFlexItem grow={false}>
              <WithWaffleTime resetOnUnmount>
                {({
                  currentTime,
                  isAutoReloading,
                  jumpToTime,
                  startAutoReload,
                  stopAutoReload,
                }) => (
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
        <PageContent>
          <WithOptions>
            {({ wafflemap, sourceId, timerange }) => (
              <WithWaffleFilter>
                {({ filterQueryAsJson }) => (
                  <WithWaffleTime>
                    {({ currentTimeRange }) => (
                      <WithWaffleNodes
                        filterQuery={filterQueryAsJson}
                        metrics={wafflemap.metrics}
                        path={wafflemap.path}
                        sourceId={sourceId}
                        timerange={currentTimeRange}
                      >
                        {({ nodes, loading, refetch }) => (
                          <Waffle
                            map={nodes}
                            loading={loading}
                            options={wafflemap}
                            reload={refetch}
=======
        <WithSource>
          {({ metricIndicesExist }) =>
            false ? (
              <>
                <WithWaffleTimeUrlState />
                <WithWaffleFilterUrlState />
                <Header />
                <Toolbar>
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
                    <EuiFlexItem grow={false}>
                      <WithWaffleTime resetOnUnmount>
                        {({
                          currentTime,
                          isAutoReloading,
                          jumpToTime,
                          startAutoReload,
                          stopAutoReload,
                        }) => (
                          <WaffleTimeControls
                            currentTime={currentTime}
                            isLiveStreaming={isAutoReloading}
                            onChangeTime={jumpToTime}
                            startLiveStreaming={startAutoReload}
                            stopLiveStreaming={stopAutoReload}
>>>>>>> Crudely handle the "no indices" state on the HomePage
                          />
                        )}
                      </WithWaffleTime>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </Toolbar>
                <PageContent>
                  <WithOptions>
                    {({ wafflemap }) => (
                      <WithWaffleFilter>
                        {({ filterQueryAsJson }) => (
                          <WithWaffleTime>
                            {({ currentTimeRange }) => (
                              <WithWaffleNodes
                                filterQuery={filterQueryAsJson}
                                metrics={wafflemap.metrics}
                                path={wafflemap.path}
                                sourceId={wafflemap.sourceId}
                                timerange={currentTimeRange}
                              >
                                {({ nodes }) => <Waffle map={nodes} options={wafflemap} />}
                              </WithWaffleNodes>
                            )}
                          </WithWaffleTime>
                        )}
                      </WithWaffleFilter>
                    )}
                  </WithOptions>
                </PageContent>
              </>
            ) : (
              <WithKibanaChrome>
                {({ basePath }) => (
                  <EmptyPage
                    title="You have no metric indices."
                    message="..."
                    actionLabel="Add metric data"
                    actionUrl={`${basePath}/app/kibana#/home/tutorial_directory/metrics`}
                  />
                )}
              </WithKibanaChrome>
            )
          }
        </WithSource>
      </ColumnarPage>
    );
  }
}
