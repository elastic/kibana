/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { Provider as ReduxProvider, useDispatch, useSelector } from 'react-redux';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { i18n } from '@kbn/i18n';

import { initKibanaService, isKibanaServiceInitialized } from '../../../synthetics_app';
import { ConfigKey } from '../../../../../../common/constants/monitor_management';

import { SyntheticsRefreshContextProvider } from '../../../contexts';
import { store, selectServiceLocationsState } from '../../../state';
import { getServiceLocations } from '../../../state/service_locations';
import { useEnablement } from '../../../hooks';
import { useMonitorList } from '../hooks/use_monitor_list';
import { DisabledCallout } from '../management/disabled_callout';

import { StepSelect } from './step_select';
import { LocationSelect } from './location_select';
import { MonitorSelect } from './monitor_select';

interface MonitorSelectorState {
  monitorId?: string;
  locationId?: string;
  step: number;
}
const initialComponentState: MonitorSelectorState = { step: 1 };

function MonitorScreenshotSelectorEmbeddable({
  basePath,
}: {
  basePath: CoreStart['http']['basePath'];
}) {
  const [persistedState, setSelectorState] = useLocalStorage<MonitorSelectorState>(
    'xpack.synthetics.monitorScreenshotSES',
    initialComponentState
  );
  const selectorState = persistedState ?? initialComponentState;

  const dispatch = useDispatch();
  const { loading: locationsLoading, locationsLoaded } = useSelector(selectServiceLocationsState);
  const { syntheticsMonitors, loading: monitorsLoading } = useMonitorList();

  const selectedMonitor = selectorState.monitorId
    ? syntheticsMonitors?.find((mon) => mon[ConfigKey.MONITOR_QUERY_ID] === selectorState.monitorId)
    : undefined;
  const monitorEditUrl = selectorState.monitorId
    ? basePath.prepend(`/app/synthetics/edit-monitor/${selectorState.monitorId}`)
    : undefined;
  const setSelectedMonitor = useCallback(
    (monitorId: string) => {
      const monitor = syntheticsMonitors?.find(
        (mon) => mon[ConfigKey.MONITOR_QUERY_ID] === monitorId
      );
      if (monitor) {
        setSelectorState({
          monitorId,
          locationId: monitor.locations?.[0].id,
          step: 1,
        });
      }
    },
    [setSelectorState, syntheticsMonitors]
  );

  const monitorLocations = selectedMonitor?.locations ?? [];
  const setSelectedLocation = useCallback(
    (locationId: string) => {
      setSelectorState((prevState) => ({
        ...prevState,
        locationId,
        step: 1,
      }));
    },
    [setSelectorState]
  );

  const setSelectedStep = useCallback(
    (step: number) => {
      setSelectorState((prevState) => ({
        ...prevState,
        step,
      }));
    },
    [setSelectorState]
  );

  useEffect(() => {
    if (!locationsLoading && !locationsLoaded) {
      dispatch(getServiceLocations());
    }
  }, [dispatch, locationsLoaded, locationsLoading]);

  useEnablement();

  return (
    <>
      <DisabledCallout total={syntheticsMonitors.length} />
      <EuiFlexGroup gutterSize="m" wrap>
        <EuiFlexItem style={{ minWidth: 300 }}>
          <MonitorSelect
            monitors={syntheticsMonitors}
            monitorsLoading={monitorsLoading}
            selectedMonitor={selectorState.monitorId}
            setSelectedMonitor={setSelectedMonitor}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ minWidth: 300 }}>
          <LocationSelect
            locations={monitorLocations}
            selectedLocationId={selectorState.locationId}
            setSelectedLocation={setSelectedLocation}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ minWidth: 300 }}>
          <StepSelect
            steps={[1, 2, 3]}
            selectedStep={selectorState.step}
            setSelectedStep={setSelectedStep}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true} />
        <EuiFlexItem />
        {selectorState.monitorId ? (
          <EuiLink
            data-test-subj="syntheticsMonitorSelectorEmbeddableEditLink"
            href={monitorEditUrl}
            target="_blank"
          >
            {i18n.translate('xpack.synthetics.monitorSelectorEmbeddable.editMonitorLabel', {
              defaultMessage: 'Edit monitor',
            })}
          </EuiLink>
        ) : null}
      </EuiFlexGroup>
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export default function Embeddable({ coreStart }: { coreStart: CoreStart }) {
  useEffect(() => {
    initKibanaService({ coreStart });
  }, [coreStart]);

  if (!isKibanaServiceInitialized()) return null;

  return (
    <ReduxProvider store={store}>
      <SyntheticsRefreshContextProvider>
        <MonitorScreenshotSelectorEmbeddable basePath={coreStart.http.basePath} />
      </SyntheticsRefreshContextProvider>
    </ReduxProvider>
  );
}
