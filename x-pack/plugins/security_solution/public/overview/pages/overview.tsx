/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiShowFor,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useState, useMemo } from 'react';

import { OVERVIEW } from '../../app/translations';
import { FiltersGlobal } from '../../common/components/filters_global';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SiemSearchBar } from '../../common/components/search_bar';
import { useFetchIndex } from '../../common/containers/source';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { InputsModelId } from '../../common/store/inputs/constants';

import { ENDPOINT_METADATA_INDEX } from '../../../common/constants';
import { SecurityPageName } from '../../app/types';
import { EmptyPrompt } from '../../common/components/empty_prompt';
import { useUserPrivileges } from '../../common/components/user_privileges';
import { useMessagesStorage } from '../../common/containers/local_storage/use_messages_storage';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { inputsSelectors } from '../../common/store';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { EndpointNotice } from '../components/endpoint_notice';
import { EventCounts } from '../components/event_counts';
import { EventsByDataset } from '../components/events_by_dataset';
import { ThreatIntelLinkPanel } from '../components/overview_cti_links';
import { StatefulSidebar } from '../components/sidebar';
import { SignalsByCategory } from '../components/signals_by_category';
import { useAllTiDataSources } from '../containers/overview_cti_links/use_all_ti_data_sources';

const OverviewComponent = () => {
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const { from, deleteQuery, setQuery, to } = useGlobalTime();
  const { indicesExist, sourcererDataView, indexPattern, selectedPatterns } =
    useSourcererDataView();

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

  return (
    <>
      <EuiScreenReaderOnly>
        <h1>{OVERVIEW}</h1>
      </EuiScreenReaderOnly>

      {indicesExist ? (
        <>
          <FiltersGlobal>
            <SiemSearchBar id={InputsModelId.global} sourcererDataView={sourcererDataView} />
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
                    <EuiFlexItem grow={false}>
                      <SignalsByCategory filters={filters} />
                      <EuiSpacer size="l" />
                    </EuiFlexItem>
                  )}

                  <EuiFlexItem grow={false}>
                    <EventsByDataset
                      deleteQuery={deleteQuery}
                      filters={filters}
                      from={from}
                      indexPattern={indexPattern}
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
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <EmptyPrompt />
      )}

      <SpyRoute pageName={SecurityPageName.overview} />
    </>
  );
};

export const StatefulOverview = React.memo(OverviewComponent);
