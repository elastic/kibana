/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';

import { AutocompleteField } from '../../../components/autocomplete_field';
import { Toolbar } from '../../../components/eui';
import { LogCustomizationMenu } from '../../../components/logging/log_customization_menu';
import { LogHighlightsMenu } from '../../../components/logging/log_highlights_menu';
import { LogHighlightsState } from '../../../containers/logs/log_highlights/log_highlights';
import { LogTextScaleControls } from '../../../components/logging/log_text_scale_controls';
import { LogTextWrapControls } from '../../../components/logging/log_text_wrap_controls';
import { LogFlyout } from '../../../containers/logs/log_flyout';
import { LogViewConfiguration } from '../../../containers/logs/log_view_configuration';
import { LogFilterState } from '../../../containers/logs/log_filter';
import { LogPositionState } from '../../../containers/logs/log_position';
import { WithKueryAutocompletion } from '../../../containers/with_kuery_autocompletion';
import { LogDatepicker } from '../../../components/logging/log_datepicker';
import { useLogSourceContext } from '../../../containers/logs/log_source';

export const LogsToolbar = () => {
  const { derivedIndexPattern } = useLogSourceContext();
  const { availableTextScales, setTextScale, setTextWrap, textScale, textWrap } = useContext(
    LogViewConfiguration.Context
  );
  const {
    filterQueryDraft,
    isFilterQueryDraftValid,
    applyLogFilterQuery,
    setLogFilterQueryDraft,
  } = useContext(LogFilterState.Context);
  const { setSurroundingLogsId } = useContext(LogFlyout.Context);

  const {
    setHighlightTerms,
    loadLogEntryHighlightsRequest,
    highlightTerms,
    hasPreviousHighlight,
    hasNextHighlight,
    goToPreviousHighlight,
    goToNextHighlight,
  } = useContext(LogHighlightsState.Context);
  const {
    isStreaming,
    startLiveStreaming,
    stopLiveStreaming,
    startDateExpression,
    endDateExpression,
    updateDateRange,
  } = useContext(LogPositionState.Context);

  return (
    <Toolbar>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem>
          <WithKueryAutocompletion indexPattern={derivedIndexPattern}>
            {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
              <AutocompleteField
                isLoadingSuggestions={isLoadingSuggestions}
                isValid={isFilterQueryDraftValid}
                loadSuggestions={loadSuggestions}
                disabled={isStreaming}
                onChange={(expression: string) => {
                  setSurroundingLogsId(null);
                  setLogFilterQueryDraft(expression);
                }}
                onSubmit={(expression: string) => {
                  setSurroundingLogsId(null);
                  applyLogFilterQuery(expression);
                }}
                placeholder={i18n.translate(
                  'xpack.infra.logsPage.toolbar.kqlSearchFieldPlaceholder',
                  { defaultMessage: 'Search for log entries… (e.g. host.name:host-1)' }
                )}
                suggestions={suggestions}
                value={filterQueryDraft ? filterQueryDraft.expression : ''}
                aria-label={i18n.translate('xpack.infra.logsPage.toolbar.kqlSearchFieldAriaLabel', {
                  defaultMessage: 'Search for log entries',
                })}
              />
            )}
          </WithKueryAutocompletion>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LogCustomizationMenu>
            <LogTextWrapControls wrap={textWrap} setTextWrap={setTextWrap} />
            <LogTextScaleControls
              availableTextScales={availableTextScales}
              textScale={textScale}
              setTextScale={setTextScale}
            />
          </LogCustomizationMenu>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LogHighlightsMenu
            onChange={setHighlightTerms}
            isLoading={loadLogEntryHighlightsRequest.state === 'pending'}
            activeHighlights={
              highlightTerms.filter((highlightTerm) => highlightTerm.length > 0).length > 0
            }
            goToPreviousHighlight={goToPreviousHighlight}
            goToNextHighlight={goToNextHighlight}
            hasPreviousHighlight={hasPreviousHighlight}
            hasNextHighlight={hasNextHighlight}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LogDatepicker
            startDateExpression={startDateExpression}
            endDateExpression={endDateExpression}
            onStartStreaming={startLiveStreaming}
            onStopStreaming={stopLiveStreaming}
            isStreaming={isStreaming}
            onUpdateDateRange={updateDateRange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Toolbar>
  );
};
