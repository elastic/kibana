/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { LogCustomizationMenu } from '../../../components/logging/log_customization_menu';
import { LogHighlightsMenu } from '../../../components/logging/log_highlights_menu';
import { LogTextScaleControls } from '../../../components/logging/log_text_scale_controls';
import { LogTextWrapControls } from '../../../components/logging/log_text_wrap_controls';
import { useLogHighlightsStateContext } from '../../../containers/logs/log_highlights/log_highlights';
import { useLogPositionStateContext } from '../../../containers/logs/log_position';
import { useLogViewConfigurationContext } from '../../../containers/logs/log_view_configuration';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useLogViewContext } from '../../../hooks/use_log_view';
import { StreamLiveButton } from './components/stream_live_button';

export const LogsToolbar = () => {
  const { derivedDataView } = useLogViewContext();
  const { availableTextScales, setTextScale, setTextWrap, textScale, textWrap } =
    useLogViewConfigurationContext();
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibanaContextForPlugin().services;

  const {
    setHighlightTerms,
    loadLogEntryHighlightsRequest,
    highlightTerms,
    hasPreviousHighlight,
    hasNextHighlight,
    goToPreviousHighlight,
    goToNextHighlight,
  } = useLogHighlightsStateContext();
  const { isStreaming, startLiveStreaming, stopLiveStreaming } = useLogPositionStateContext();

  const dataViews = useMemo(
    () => (derivedDataView != null ? [derivedDataView] : undefined),
    [derivedDataView]
  );

  return (
    <>
      <SearchBar
        appName={i18n.translate('xpack.infra.appName', {
          defaultMessage: 'Infra logs',
        })}
        iconType="search"
        placeholder={i18n.translate('xpack.infra.logsPage.toolbar.kqlSearchFieldPlaceholder', {
          defaultMessage: 'Search for log entries… (e.g. host.name:host-1)',
        })}
        useDefaultBehaviors={true}
        indexPatterns={dataViews}
        showQueryInput={true}
        showQueryMenu={false}
        showFilterBar={true}
        showDatePicker={true}
        displayStyle="inPage"
      />
      <EuiSpacer size="s" />
      <div>
        <EuiFlexGroup
          alignItems="stretch"
          justifyContent="flexStart"
          direction="row"
          gutterSize="none"
        >
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
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <StreamLiveButton
              isStreaming={isStreaming}
              onStartStreaming={startLiveStreaming}
              onStopStreaming={stopLiveStreaming}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </>
  );
};
