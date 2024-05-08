/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ATTACK_DISCOVERY_STORAGE_KEY,
  DEFAULT_ASSISTANT_NAMESPACE,
  useAssistantContext,
  useLoadConnectors,
} from '@kbn/elastic-assistant';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { uniq } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from 'react-use';

import { SecurityRoutePageWrapper } from '../../common/components/security_route_page_wrapper';
import { SecurityPageName } from '../../../common/constants';
import { HeaderPage } from '../../common/components/header_page';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { Header } from './header';
import {
  CONNECTOR_ID_LOCAL_STORAGE_KEY,
  getInitialIsOpen,
  showLoading,
  showSummary,
} from './helpers';
import { AttackDiscoveryPanel } from '../attack_discovery_panel';
import { EmptyStates } from './empty_states';
import { LoadingCallout } from './loading_callout';
import { PageTitle } from './page_title';
import { Summary } from './summary';
import { Upgrade } from './upgrade';
import { useAttackDiscovery } from '../use_attack_discovery';
import type { AttackDiscovery } from '../types';

const AttackDiscoveryPageComponent: React.FC = () => {
  const spaceId = useSpaceId() ?? 'default';

  const {
    assistantAvailability: { isAssistantEnabled },
    http,
    knowledgeBase,
  } = useAssistantContext();
  const { data: aiConnectors } = useLoadConnectors({
    http,
  });

  // for showing / hiding anonymized data:
  const [showAnonymized, setShowAnonymized] = useState<boolean>(false);
  const onToggleShowAnonymized = useCallback(() => setShowAnonymized((current) => !current), []);

  // get the last selected connector ID from local storage:
  const [localStorageAttackDiscoveryConnectorId, setLocalStorageAttackDiscoveryConnectorId] =
    useLocalStorage<string>(
      `${DEFAULT_ASSISTANT_NAMESPACE}.${ATTACK_DISCOVERY_STORAGE_KEY}.${spaceId}.${CONNECTOR_ID_LOCAL_STORAGE_KEY}`
    );

  const [connectorId, setConnectorId] = React.useState<string | undefined>(
    localStorageAttackDiscoveryConnectorId
  );

  // state for the connector loading in the background:
  const [loadingConnectorId, setLoadingConnectorId] = useState<string | null>(null);

  const {
    alertsContextCount,
    approximateFutureTime,
    attackDiscoveries,
    cachedAttackDiscoveries,
    fetchAttackDiscoveries,
    generationIntervals,
    isLoading,
    lastUpdated,
    replacements,
  } = useAttackDiscovery({
    connectorId,
    setConnectorId,
    setLoadingConnectorId,
  });

  // get last updated from the cached attack discoveries if it exists:
  const [selectedConnectorLastUpdated, setSelectedConnectorLastUpdated] = useState<Date | null>(
    cachedAttackDiscoveries[connectorId ?? '']?.updated ?? null
  );

  // get cached attack discoveries if they exist:
  const [selectedConnectorAttackDiscoveries, setSelectedConnectorAttackDiscoveries] = useState<
    AttackDiscovery[]
  >(cachedAttackDiscoveries[connectorId ?? '']?.attackDiscoveries ?? []);

  // get replacements from the cached attack discoveries if they exist:
  const [selectedConnectorReplacements, setSelectedConnectorReplacements] = useState<Replacements>(
    cachedAttackDiscoveries[connectorId ?? '']?.replacements ?? {}
  );

  // the number of unique alerts in the attack discoveries:
  const alertsCount = useMemo(
    () =>
      uniq(
        selectedConnectorAttackDiscoveries.flatMap((attackDiscovery) => attackDiscovery.alertIds)
      ).length,
    [selectedConnectorAttackDiscoveries]
  );

  /** The callback when users select a connector ID */
  const onConnectorIdSelected = useCallback(
    (selectedConnectorId: string) => {
      // update the connector ID in local storage:
      setConnectorId(selectedConnectorId);
      setLocalStorageAttackDiscoveryConnectorId(selectedConnectorId);

      // get the cached attack discoveries for the selected connector:
      const cached = cachedAttackDiscoveries[selectedConnectorId];
      if (cached != null) {
        setSelectedConnectorReplacements(cached.replacements ?? {});
        setSelectedConnectorAttackDiscoveries(cached.attackDiscoveries ?? []);
        setSelectedConnectorLastUpdated(cached.updated ?? null);
      } else {
        setSelectedConnectorReplacements({});
        setSelectedConnectorAttackDiscoveries([]);
        setSelectedConnectorLastUpdated(null);
      }
    },
    [cachedAttackDiscoveries, setLocalStorageAttackDiscoveryConnectorId]
  );

  // get connector intervals from generation intervals:
  const connectorIntervals = useMemo(
    () => generationIntervals?.[connectorId ?? ''] ?? [],
    [connectorId, generationIntervals]
  );

  const pageTitle = useMemo(() => <PageTitle />, []);

  const onGenerate = useCallback(async () => fetchAttackDiscoveries(), [fetchAttackDiscoveries]);

  useEffect(() => {
    setSelectedConnectorReplacements(replacements);
    setSelectedConnectorAttackDiscoveries(attackDiscoveries);
    setSelectedConnectorLastUpdated(lastUpdated);
  }, [attackDiscoveries, lastUpdated, replacements]);

  useEffect(() => {
    // If there is only one connector, set it as the selected connector
    if (aiConnectors != null && aiConnectors.length === 1) {
      setConnectorId(aiConnectors[0].id);
    }
  }, [aiConnectors, setConnectorId]);

  const attackDiscoveriesCount = selectedConnectorAttackDiscoveries.length;

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
        data-test-subj="attackDiscoveryPage"
        pageName={SecurityPageName.attackDiscovery}
      >
        <HeaderPage border title={pageTitle}>
          <Header
            connectorId={connectorId}
            connectorsAreConfigured={aiConnectors != null && aiConnectors.length > 0}
            isLoading={isLoading}
            onConnectorIdSelected={onConnectorIdSelected}
            onGenerate={onGenerate}
          />
          <EuiSpacer size="m" />
        </HeaderPage>

        {showSummary({
          attackDiscoveriesCount,
          connectorId,
          loadingConnectorId,
        }) && (
          <Summary
            alertsCount={alertsCount}
            attackDiscoveriesCount={attackDiscoveriesCount}
            lastUpdated={selectedConnectorLastUpdated}
            onToggleShowAnonymized={onToggleShowAnonymized}
            showAnonymized={showAnonymized}
          />
        )}

        <>
          {showLoading({
            attackDiscoveriesCount,
            connectorId,
            isLoading,
            loadingConnectorId,
          }) ? (
            <LoadingCallout
              alertsCount={knowledgeBase.latestAlerts}
              approximateFutureTime={approximateFutureTime}
              connectorIntervals={connectorIntervals}
            />
          ) : (
            selectedConnectorAttackDiscoveries.map((attackDiscovery, i) => (
              <React.Fragment key={attackDiscovery.id}>
                <AttackDiscoveryPanel
                  attackDiscovery={attackDiscovery}
                  initialIsOpen={getInitialIsOpen(i)}
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
            <EmptyStates
              aiConnectorsCount={aiConnectors?.length ?? null}
              alertsContextCount={alertsContextCount}
              alertsCount={knowledgeBase.latestAlerts}
              attackDiscoveriesCount={attackDiscoveriesCount}
              connectorId={connectorId}
              isLoading={isLoading}
              onGenerate={onGenerate}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <SpyRoute pageName={SecurityPageName.attackDiscovery} />
      </SecurityRoutePageWrapper>
    </div>
  );
};

AttackDiscoveryPageComponent.displayName = 'AttackDiscoveryPage';

export const AttackDiscoveryPage = React.memo(AttackDiscoveryPageComponent);
