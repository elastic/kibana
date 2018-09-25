/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { AutocompleteField } from '../../components/autocomplete_field';
import { Toolbar } from '../../components/eui/toolbar';
import { WaffleTimeControls } from '../../components/waffle/waffle_time_controls';

import { WithWaffleFilter } from '../../containers/waffle/with_waffle_filters';
import { WithWaffleTime } from '../../containers/waffle/with_waffle_time';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';

export const HomeToolbar: React.SFC = () => (
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
