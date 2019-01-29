/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import React from 'react';

import { AutocompleteField } from '../../components/autocomplete_field';
import { Toolbar } from '../../components/eui';
import { LogCustomizationMenu } from '../../components/logging/log_customization_menu';
import { LogMinimapScaleControls } from '../../components/logging/log_minimap_scale_controls';
import { LogTextScaleControls } from '../../components/logging/log_text_scale_controls';
import { LogTextWrapControls } from '../../components/logging/log_text_wrap_controls';
import { LogTimeControls } from '../../components/logging/log_time_controls';
import { SourceConfigurationButton } from '../../components/source_configuration';
import { WithLogFilter } from '../../containers/logs/with_log_filter';
import { WithLogMinimap } from '../../containers/logs/with_log_minimap';
import { WithLogPosition } from '../../containers/logs/with_log_position';
import { WithLogTextview } from '../../containers/logs/with_log_textview';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';
import { WithSource } from '../../containers/with_source';

export const LogsToolbar = injectI18n(({ intl }) => (
  <Toolbar>
    <WithSource>
      {({ configuration, derivedIndexPattern }) => (
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
          <EuiFlexItem>
            <WithKueryAutocompletion indexPattern={derivedIndexPattern}>
              {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
                <WithLogFilter indexPattern={derivedIndexPattern}>
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
                        id: 'xpack.infra.logsPage.toolbar.kqlSearchFieldPlaceholder',
                        defaultMessage: 'Search for log entries… (e.g. host.name:host-1)',
                      })}
                      suggestions={suggestions}
                      value={filterQueryDraft ? filterQueryDraft.expression : ''}
                    />
                  )}
                </WithLogFilter>
              )}
            </WithKueryAutocompletion>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SourceConfigurationButton />
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
      )}
    </WithSource>
  </Toolbar>
));
