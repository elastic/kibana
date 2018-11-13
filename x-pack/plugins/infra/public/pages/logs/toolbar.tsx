/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { AutocompleteField } from '../../components/autocomplete_field';
import { Toolbar } from '../../components/eui';
import { LogCustomizationMenu } from '../../components/logging/log_customization_menu';
import { LogMinimapScaleControls } from '../../components/logging/log_minimap_scale_controls';
import { LogTextScaleControls } from '../../components/logging/log_text_scale_controls';
import { LogTextWrapControls } from '../../components/logging/log_text_wrap_controls';
import { LogTimeControls } from '../../components/logging/log_time_controls';
import { WithLogFilter } from '../../containers/logs/with_log_filter';
import { WithLogMinimap } from '../../containers/logs/with_log_minimap';
import { WithLogPosition } from '../../containers/logs/with_log_position';
import { WithLogTextview } from '../../containers/logs/with_log_textview';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';

export const LogsToolbar: React.SFC = () => (
  <Toolbar>
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
      <EuiFlexItem>
        <WithKueryAutocompletion>
          {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
            <WithLogFilter>
              {({
                applyFilterQueryFromKueryExpression,
                /* filterQuery,*/
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
                  placeholder="Search for log entries... (e.g. host.name:host-1)"
                  suggestions={suggestions}
                  value={filterQueryDraft ? filterQueryDraft.expression : ''}
                />
              )}
            </WithLogFilter>
          )}
        </WithKueryAutocompletion>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <LogCustomizationMenu>
          <WithLogMinimap>
            {({ availableIntervalSizes, intervalSize, setIntervalSize }) => (
              <LogMinimapScaleControls
                availableIntervalSizes={availableIntervalSizes}
                setIntervalSize={setIntervalSize}
                intervalSize={intervalSize}
              />
            )}
          </WithLogMinimap>
          <WithLogTextview>
            {({ availableTextScales, textScale, setTextScale, setTextWrap, wrap }) => (
              <>
                <LogTextWrapControls wrap={wrap} setTextWrap={setTextWrap} />
                <LogTextScaleControls
                  availableTextScales={availableTextScales}
                  textScale={textScale}
                  setTextScale={setTextScale}
                />
              </>
            )}
          </WithLogTextview>
        </LogCustomizationMenu>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <WithLogPosition resetOnUnmount>
          {({
            visibleMidpointTime,
            isAutoReloading,
            jumpToTargetPositionTime,
            startLiveStreaming,
            stopLiveStreaming,
          }) => (
            <LogTimeControls
              currentTime={visibleMidpointTime}
              isLiveStreaming={isAutoReloading}
              jumpToTime={jumpToTargetPositionTime}
              startLiveStreaming={startLiveStreaming}
              stopLiveStreaming={stopLiveStreaming}
            />
          )}
        </WithLogPosition>
      </EuiFlexItem>
    </EuiFlexGroup>
  </Toolbar>
);
