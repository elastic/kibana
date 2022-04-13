/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiShowFor } from '@elastic/eui';
import React, { useCallback, useState, useMemo } from 'react';

import { AlertsByCategory } from '../components/alerts_by_category';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { useFetchIndex } from '../../common/containers/source';

import { EventsByDataset } from '../components/events_by_dataset';
import { EventCounts } from '../components/event_counts';
import { StatefulSidebar } from '../components/sidebar';
import { SignalsByCategory } from '../components/signals_by_category';
import { inputsSelectors } from '../../common/store';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { EndpointNotice } from '../components/endpoint_notice';
import { useMessagesStorage } from '../../common/containers/local_storage/use_messages_storage';
import { ENDPOINT_METADATA_INDEX } from '../../../common/constants';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { ThreatIntelLinkPanel } from '../components/overview_cti_links';
import { useAllTiDataSources } from '../containers/overview_cti_links/use_all_ti_data_sources';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { RiskyHostLinks } from '../components/overview_risky_host_links';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { LandingPageComponent } from '../../common/components/landing_page';

const OverviewComponent = () => {
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const { from, deleteQuery, setQuery, to } = useGlobalTime();
  const { indicesExist, indexPattern, selectedPatterns } = useSourcererDataView();

  const endpointMetadataIndex = useMemo<string[]>(() => {
    return [ENDPOINT_METADATA_INDEX];
  }, []);
  const [, { indexExists: metadataIndexExists }] = useFetchIndex(endpointMetadataIndex, true);
  const { addMessage, hasMessage } = useMessagesStorage();
  const hasDismissEndpointNoticeMessage: boolean = useMemo(
    () => hasMessage('management', 'dismissEndpointNotice'),
    [hasMessage]
  );

  const [dismissMessage, setDismissMessage] = useState<boolean>(hasDismissEndpointNoticeMessage);
  const dismissEndpointNotice = useCallback(() => {
    setDismissMessage(true);
    addMessage('management', 'dismissEndpointNotice');
  }, [addMessage]);
  const {
    endpointPrivileges: { canAccessFleet },
  } = useUserPrivileges();
  const { hasIndexRead, hasKibanaREAD } = useAlertsPrivileges();
  const { tiDataSources: allTiDataSources, isInitiallyLoaded: isTiLoaded } = useAllTiDataSources();

  const riskyHostsEnabled = useIsExperimentalFeatureEnabled('riskyHostsEnabled');

  return (
    <>
      {indicesExist ? (
        <>
          <FiltersGlobal>
            <SiemSearchBar id="global" indexPattern={indexPattern} />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper>
            {!dismissMessage && !metadataIndexExists && canAccessFleet && (
              <>
                <EndpointNotice onDismiss={dismissEndpointNotice} />
                <EuiSpacer size="l" />
              </>
            )}
            <EuiFlexGroup>
              <EuiShowFor sizes={['xl']}>
                <EuiFlexItem grow={1}>
                  <StatefulSidebar />
                </EuiFlexItem>
              </EuiShowFor>

              <EuiFlexItem grow={3}>
                <EuiFlexGroup direction="column" responsive={false} gutterSize="none">
                  {hasIndexRead && hasKibanaREAD && (
                    <>
                      <EuiFlexItem grow={false}>
                        <SignalsByCategory filters={filters} query={query} />
                        <EuiSpacer size="l" />
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <AlertsByCategory
                          deleteQuery={deleteQuery}
                          filters={filters}
                          from={from}
                          indexPattern={indexPattern}
                          indexNames={selectedPatterns}
                          query={query}
                          setQuery={setQuery}
                          to={to}
                        />
                      </EuiFlexItem>
                    </>
                  )}

                  <EuiFlexItem grow={false}>
                    <EventsByDataset
                      deleteQuery={deleteQuery}
                      filters={filters}
                      from={from}
                      indexPattern={indexPattern}
                      indexNames={selectedPatterns}
                      query={query}
                      queryType="overview"
                      setQuery={setQuery}
                      to={to}
                    />
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <EventCounts
                      filters={filters}
                      from={from}
                      indexNames={selectedPatterns}
                      indexPattern={indexPattern}
                      query={query}
                      setQuery={setQuery}
                      to={to}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup direction="row">
                      <EuiFlexItem grow={1}>
                        {isTiLoaded && (
                          <ThreatIntelLinkPanel
                            allTiDataSources={allTiDataSources}
                            deleteQuery={deleteQuery}
                            from={from}
                            setQuery={setQuery}
                            to={to}
                          />
                        )}
                      </EuiFlexItem>
                      <EuiFlexItem grow={1}>
                        {riskyHostsEnabled && (
                          <RiskyHostLinks
                            deleteQuery={deleteQuery}
                            setQuery={setQuery}
                            timerange={{
                              from,
                              to,
                            }}
                          />
                        )}
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <LandingPageComponent />
      )}

      <SpyRoute pageName={SecurityPageName.overview} />
    </>
  );
};

export const StatefulOverview = React.memo(OverviewComponent);
