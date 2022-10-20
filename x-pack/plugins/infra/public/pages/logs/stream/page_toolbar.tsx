/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { QueryStringInput } from '@kbn/unified-search-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { LogCustomizationMenu } from '../../../components/logging/log_customization_menu';
import { LogDatepicker } from '../../../components/logging/log_datepicker';
import { LogHighlightsMenu } from '../../../components/logging/log_highlights_menu';
import { LogTextScaleControls } from '../../../components/logging/log_text_scale_controls';
import { LogTextWrapControls } from '../../../components/logging/log_text_wrap_controls';
import { useLogFilterStateContext } from '../../../containers/logs/log_filter';
import { useLogEntryFlyoutContext } from '../../../containers/logs/log_flyout';
import { useLogHighlightsStateContext } from '../../../containers/logs/log_highlights/log_highlights';
import { useLogPositionStateContext } from '../../../containers/logs/log_position';
import { useLogViewConfigurationContext } from '../../../containers/logs/log_view_configuration';
import { useLogViewContext } from '../../../hooks/use_log_view';

export const LogsToolbar = () => {
  const { derivedDataView } = useLogViewContext();
  const { availableTextScales, setTextScale, setTextWrap, textScale, textWrap } =
    useLogViewConfigurationContext();
  const { filterQueryDraft, isFilterQueryDraftValid, applyLogFilterQuery, setLogFilterQueryDraft } =
    useLogFilterStateContext();
  const { setSurroundingLogsId } = useLogEntryFlyoutContext();
  const { http, notifications, docLinks, uiSettings, data, dataViews, storage, unifiedSearch } =
    useKibanaContextForPlugin().services;

  const {
    setHighlightTerms,
    loadLogEntryHighlightsRequest,
    highlightTerms,
    hasPreviousHighlight,
    hasNextHighlight,
    goToPreviousHighlight,
    goToNextHighlight,
  } = useLogHighlightsStateContext();
  const {
    isStreaming,
    startLiveStreaming,
    stopLiveStreaming,
    startDateExpression,
    endDateExpression,
    updateDateRange,
  } = useLogPositionStateContext();

  return (
    <div>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="l" wrap>
        <QueryBarFlexItem>
          <QueryStringInput
            disableLanguageSwitcher={true}
            iconType="search"
            indexPatterns={[derivedDataView as DataView]}
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
            appName={i18n.translate('xpack.infra.appName', {
              defaultMessage: 'Infra logs',
            })}
            deps={{
              unifiedSearch,
              notifications,
              http,
              docLinks,
              uiSettings,
              data,
              dataViews,
              storage,
            }}
          />
        </QueryBarFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
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
          </EuiFlexGroup>
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
    </div>
  );
};

const QueryBarFlexItem = euiStyled(EuiFlexItem)`
  @media (min-width: 1200px) {
    flex: 0 0 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: 12px;
    padding-right: 12px;
  }
`;
