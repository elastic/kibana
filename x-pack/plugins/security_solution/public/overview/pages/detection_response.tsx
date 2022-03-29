/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { FormattedRelative } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
// import { useGlobalTime } from '../../common/containers/use_global_time';

import { OverviewEmpty } from '../components/overview_empty';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { HeaderPage } from '../../common/components/header_page';
import { useShallowEqualSelector } from '../../common/hooks/use_selector';
import { DETECTION_RESPONSE_TITLE, UPDATED, UPDATING } from './translations';
import { inputsSelectors } from '../../common/store/selectors';
import { alertsData } from '../components/alerts_by_status/mock_data';
import { AlertsByStatus } from '../components/alerts_by_status';

const DetectionResponseComponent = () => {
  const getGlobalQuery = useMemo(() => inputsSelectors.globalQuery(), []);
  const { indicesExist, indexPattern, loading: isSourcererLoading } = useSourcererDataView();
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  // TODO: link queries with global time queries
  // const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();

  const queriesLoading: boolean = useShallowEqualSelector(
    (state) => !!getGlobalQuery(state).find((query) => query.loading)
  );

  useEffect(() => {
    if (!queriesLoading) {
      setUpdatedAt(Date.now());
    }
  }, [queriesLoading]);

  const showUpdating = useMemo(
    () => queriesLoading || isSourcererLoading,
    [queriesLoading, isSourcererLoading]
  );

  const { hasIndexRead, hasKibanaREAD } = useAlertsPrivileges();
  return (
    <>
      {indicesExist ? (
        <>
          <SecuritySolutionPageWrapper>
            <HeaderPage title={DETECTION_RESPONSE_TITLE}>
              <SiemSearchBar id="global" indexPattern={indexPattern} hideFilterBar hideQueryInput />
            </HeaderPage>
            <EuiFlexGroup>
              {showUpdating ? (
                <EuiFlexItem grow={false}>{UPDATING}</EuiFlexItem>
              ) : (
                <EuiFlexItem grow={false}>
                  <>{UPDATED} </>
                  <FormattedRelative
                    data-test-subj="last-updated-at-date"
                    key={`formatedRelative-${Date.now()}`}
                    value={new Date(updatedAt)}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>

            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    {hasIndexRead && hasKibanaREAD && (
                      <EuiFlexGroup>
                        <AlertsByStatus
                          title="Alerts"
                          donutData={alertsData()} // Todo
                          id="alertByStatus"
                          filterQuery={''} // Todo
                          legendField="kibana.alert.severity"
                          isInitialLoading={false} // Todo
                          loading={false} // Todo
                          showInspectButton={true} // Todo
                        />
                      </EuiFlexGroup>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>{'[cases chart]'}</EuiFlexItem>
              <EuiFlexItem>{'[rules table]'}</EuiFlexItem>
              <EuiFlexItem>{'[cases table]'}</EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem>{'[hosts table]'}</EuiFlexItem>
                  <EuiFlexItem>{'[users table]'}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <OverviewEmpty />
      )}

      <SpyRoute pageName={SecurityPageName.detectionAndResponse} />
    </>
  );
};

export const DetectionResponse = React.memo(DetectionResponseComponent);
