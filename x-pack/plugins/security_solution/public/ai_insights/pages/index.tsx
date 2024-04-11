/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  AI_INSIGHTS_STORAGE_KEY,
  DEFAULT_ASSISTANT_NAMESPACE,
  useAssistantContext,
} from '@kbn/elastic-assistant';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { uniq } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from 'react-use';

import { SecurityRoutePageWrapper } from '../../common/components/security_route_page_wrapper';
import { SecurityPageName } from '../../../common/constants';
import { HeaderPage } from '../../common/components/header_page';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { EmptyPrompt } from './empty_prompt';
import { Header } from './header';
import {
  CONNECTOR_ID_LOCAL_STORAGE_KEY,
  getInitialIsOpen,
  showEmptyPrompt,
  showLoading,
  showSummary,
} from './helpers';
import { Insight } from '../insight';
import { LoadingPlaceholder } from '../insight/loading_placeholder';
import { LoadingCallout } from './loading_callout';
import { PageTitle } from './page_title';
import { Summary } from './summary';
import { Upgrade } from './upgrade';
import { useInsights } from '../use_insights';
import type { AlertsInsight } from '../types';

const AiInsightsComponent: React.FC = () => {
  const {
    assistantAvailability: { isAssistantEnabled },
    knowledgeBase,
  } = useAssistantContext();

  // for showing / hiding anonymized data:
  const [showAnonymized, setShowAnonymized] = useState<boolean>(false);
  const onToggleShowAnonymized = useCallback(() => setShowAnonymized((current) => !current), []);

  // get the last selected connector ID from local storage:
  const [localStorageAiInsightsConnectorId, setLocalStorageAiInsightsConnectorId] =
    useLocalStorage<string>(
      `${DEFAULT_ASSISTANT_NAMESPACE}.${AI_INSIGHTS_STORAGE_KEY}.${CONNECTOR_ID_LOCAL_STORAGE_KEY}`
    );

  const [connectorId, setConnectorId] = React.useState<string | undefined>(
    localStorageAiInsightsConnectorId
  );

  // state for the connector loading in the background:
  const [loadingConnectorId, setLoadingConnectorId] = useState<string | null>(null);

  const {
    approximateFutureTime,
    cachedInsights,
    fetchInsights,
    generationIntervals,
    insights,
    lastUpdated,
    replacements,
    isLoading,
  } = useInsights({
    connectorId,
    setConnectorId,
    setLoadingConnectorId,
  });

  // get last updated from the cached insights if it exists:
  const [selectedConnectorLastUpdated, setSelectedConnectorLastUpdated] = useState<Date | null>(
    cachedInsights[connectorId ?? '']?.updated ?? null
  );

  // get cached insights if they exist:
  const [selectedConnectorInsights, setSelectedConnectorInsights] = useState<AlertsInsight[]>(
    cachedInsights[connectorId ?? '']?.insights ?? []
  );

  // get replacements from the cached insights if they exist:
  const [selectedConnectorReplacements, setSelectedConnectorReplacements] = useState<Replacements>(
    cachedInsights[connectorId ?? '']?.replacements ?? {}
  );

  // the number of unique alerts in the insights:
  const alertsCount = useMemo(
    () => uniq(selectedConnectorInsights.flatMap((insight) => insight.alertIds)).length,
    [selectedConnectorInsights]
  );

  /** The callback when users select a connector ID */
  const onConnectorIdSelected = useCallback(
    (selectedConnectorId: string) => {
      // update the connector ID in local storage:
      setConnectorId(selectedConnectorId);
      setLocalStorageAiInsightsConnectorId(selectedConnectorId);

      // get the cached insights for the selected connector:
      const cached = cachedInsights[selectedConnectorId];
      if (cached != null) {
        setSelectedConnectorReplacements(cached.replacements ?? {});
        setSelectedConnectorInsights(cached.insights ?? []);
        setSelectedConnectorLastUpdated(cached.updated ?? null);
      } else {
        setSelectedConnectorReplacements({});
        setSelectedConnectorInsights([]);
        setSelectedConnectorLastUpdated(null);
      }
    },
    [cachedInsights, setLocalStorageAiInsightsConnectorId]
  );

  // get connector intervals from generation intervals:
  const connectorIntervals = useMemo(
    () => generationIntervals?.[connectorId ?? ''] ?? [],
    [connectorId, generationIntervals]
  );

  const pageTitle = useMemo(() => <PageTitle />, []);

  const onGenerate = useCallback(async () => fetchInsights(), [fetchInsights]);

  useEffect(() => {
    setSelectedConnectorReplacements(replacements);
    setSelectedConnectorInsights(insights);
    setSelectedConnectorLastUpdated(lastUpdated);
  }, [insights, lastUpdated, replacements]);

  const insightsCount = selectedConnectorInsights.length;

  if (!isAssistantEnabled) {
    return (
      <>
        <EuiSpacer size="xxl" />
        <Upgrade />
      </>
    );
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
      `}
      data-test-subj="fullHeightContainer"
    >
      <SecurityRoutePageWrapper
        data-test-subj="aiInsightsPage"
        pageName={SecurityPageName.aiInsights}
      >
        <HeaderPage border title={pageTitle}>
          <Header
            connectorId={connectorId}
            isLoading={isLoading}
            onConnectorIdSelected={onConnectorIdSelected}
            onGenerate={onGenerate}
          />
          <EuiSpacer size="m" />
        </HeaderPage>

        {showSummary({
          connectorId,
          insightsCount,
          loadingConnectorId,
        }) && (
          <Summary
            alertsCount={alertsCount}
            insightsCount={insightsCount}
            lastUpdated={selectedConnectorLastUpdated}
            onToggleShowAnonymized={onToggleShowAnonymized}
            showAnonymized={showAnonymized}
          />
        )}

        <>
          {showLoading({
            connectorId,
            insightsCount,
            isLoading,
            loadingConnectorId,
          }) ? (
            <>
              <LoadingCallout
                alertsCount={knowledgeBase.latestAlerts}
                connectorIntervals={connectorIntervals}
                approximateFutureTime={approximateFutureTime}
              />
              <EuiSpacer size="m" />
              <LoadingPlaceholder />
            </>
          ) : (
            selectedConnectorInsights.map((insight, i) => (
              <React.Fragment key={insight.id}>
                <Insight
                  initialIsOpen={getInitialIsOpen(i)}
                  insight={insight}
                  showAnonymized={showAnonymized}
                  replacements={selectedConnectorReplacements}
                />
                <EuiSpacer size="l" />
              </React.Fragment>
            ))
          )}
        </>
        <EuiFlexGroup
          css={css`
            max-height: 100%;
            min-height: 100%;
          `}
          direction="column"
          gutterSize="none"
        >
          <EuiSpacer size="xxl" />

          <EuiFlexItem grow={false}>
            {showEmptyPrompt({ insightsCount, isLoading }) && (
              <EmptyPrompt
                alertsCount={knowledgeBase.latestAlerts}
                isDisabled={connectorId == null}
                isLoading={isLoading}
                onGenerate={onGenerate}
              />
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={true} />
        </EuiFlexGroup>
        <SpyRoute pageName={SecurityPageName.aiInsights} />
      </SecurityRoutePageWrapper>
    </div>
  );
};

export const AiInsights = React.memo(AiInsightsComponent);
