/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core-lifecycle-browser';
import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Provider as ReduxProvider, useDispatch, useSelector } from 'react-redux';

import { initKibanaService } from '../../../../../synthetics_app';

import { SyntheticsRefreshContextProvider } from '../../../../../contexts';
import { useEnablement } from '../../../../../hooks';
import {
  fetchMonitorOverviewAction,
  store,
  setOverviewPageStateAction,
  selectMonitorListState,
  selectOverviewState,
  selectServiceLocationsState,
} from '../../../../../state';
import { getServiceLocations } from '../../../../../state/service_locations';

import { NoMonitorsFound } from '../../../common/no_monitors_found';
import { OverviewAlerts } from '../overview_alerts';
import { OverviewErrors } from '../overview_errors/overview_errors';
import { OverviewStatusEmbeddable } from './overview_status_embeddable';

function SyntheticsOverviewEmbeddable({ serviceName }: { serviceName: string }) {
  const dispatch = useDispatch();

  const { loading: locationsLoading, locationsLoaded } = useSelector(selectServiceLocationsState);

  useEffect(() => {
    if (!locationsLoading && !locationsLoaded) {
      dispatch(getServiceLocations());
    }
  }, [dispatch, locationsLoaded, locationsLoading]);

  const {
    enablement: { isEnabled },
    loading: enablementLoading,
  } = useEnablement();

  const {
    data: { monitors },
    pageState,
  } = useSelector(selectOverviewState);

  const {
    loading: monitorsLoading,
    loaded: monitorsLoaded,
    data,
  } = useSelector(selectMonitorListState);

  // React to service name changes
  useEffect(() => {
    dispatch(setOverviewPageStateAction({ serviceNames: serviceName ? [serviceName] : [] }));
  }, [dispatch, serviceName]);

  // fetch overview for all other page state changes
  useEffect(() => {
    if (!monitorsLoaded) {
      dispatch(fetchMonitorOverviewAction.get(pageState));
    }
    // change only needs to be triggered on pageState change
  }, [dispatch, pageState, monitorsLoaded]);

  const hasNoMonitors = !enablementLoading && monitorsLoaded && (data?.absoluteTotal ?? 0) === 0;

  if (hasNoMonitors && !monitorsLoading && isEnabled) {
    // return <Redirect to={GETTING_STARTED_ROUTE} />;
  }

  if (!isEnabled && hasNoMonitors) {
    // return <Redirect to={MONITORS_ROUTE} />;
  }

  const noMonitorFound = monitorsLoaded && monitors?.length === 0;

  return (
    <>
      {!noMonitorFound ? (
        <>
          <EuiFlexGroup gutterSize="m" wrap>
            <EuiFlexItem grow={2}>
              <OverviewStatusEmbeddable />
            </EuiFlexItem>
            <EuiFlexItem grow={3} style={{ minWidth: 300 }}>
              <OverviewErrors />
            </EuiFlexItem>
            <EuiFlexItem grow={3} style={{ minWidth: 300 }}>
              <OverviewAlerts />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : (
        <NoMonitorsFound />
      )}
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export default function Embeddable({
  serviceName,
  coreStart,
}: {
  serviceName: string;
  coreStart: CoreStart;
}) {
  useEffect(() => {
    initKibanaService({ coreStart });
  }, [coreStart]);

  return (
    <ReduxProvider store={store}>
      <SyntheticsRefreshContextProvider>
        <SyntheticsOverviewEmbeddable serviceName={serviceName} />
      </SyntheticsRefreshContextProvider>
    </ReduxProvider>
  );
}
