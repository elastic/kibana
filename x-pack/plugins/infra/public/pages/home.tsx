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
import { WithWaffleFilter } from '../containers/waffle/with_waffle_filters';
import { WithWaffleNodes } from '../containers/waffle/with_waffle_nodes';
import { WithKueryAutocompletion } from '../containers/with_kuery_autocompletion';
import { WithOptions } from '../containers/with_options';

export class HomePage extends React.PureComponent {
  public render() {
    return (
      <ColumnarPage>
        <Header />
        <Toolbar>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
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
          </EuiFlexGroup>
        </Toolbar>
        <PageContent>
          <WithOptions>
            {({ wafflemap }) => (
              <WithWaffleFilter>
                {({ filterQueryAsJson }) => (
                  <WithWaffleNodes
                    filterQuery={filterQueryAsJson}
                    metrics={wafflemap.metrics}
                    path={wafflemap.path}
                    sourceId={wafflemap.sourceId}
                    timerange={wafflemap.timerange}
                  >
                    {({ nodes }) => <Waffle map={nodes} options={wafflemap} />}
                  </WithWaffleNodes>
                )}
              </WithWaffleFilter>
            )}
          </WithOptions>
        </PageContent>
      </ColumnarPage>
    );
  }
}
