/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { Query, QueryStringInput } from '../../../../../../../src/plugins/data/public';
import { Toolbar } from '../../../components/eui';
import { LogCustomizationMenu } from '../../../components/logging/log_customization_menu';
import { LogDatepicker } from '../../../components/logging/log_datepicker';
import { LogHighlightsMenu } from '../../../components/logging/log_highlights_menu';
import { LogTextScaleControls } from '../../../components/logging/log_text_scale_controls';
import { LogTextWrapControls } from '../../../components/logging/log_text_wrap_controls';
import { LogFilterState } from '../../../containers/logs/log_filter';
import { LogFlyout } from '../../../containers/logs/log_flyout';
import { LogHighlightsState } from '../../../containers/logs/log_highlights/log_highlights';
import { LogPositionState } from '../../../containers/logs/log_position';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { LogViewConfiguration } from '../../../containers/logs/log_view_configuration';

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
          <QueryStringInput
            disableLanguageSwitcher={true}
            iconType="search"
            indexPatterns={[derivedIndexPattern]}
            isInvalid={!isFilterQueryDraftValid}
            onChange={(query: Query) => {
              setSurroundingLogsId(null);
              setLogFilterQueryDraft(query);
            }}
            onSubmit={(query: Query) => {
              setSurroundingLogsId(null);
              applyLogFilterQuery(query);
            }}
            placeholder={i18n.translate('xpack.infra.logsPage.toolbar.kqlSearchFieldPlaceholder', {
              defaultMessage: 'Search for log entries… (e.g. host.name:host-1)',
            })}
            query={filterQueryDraft}
          />
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
