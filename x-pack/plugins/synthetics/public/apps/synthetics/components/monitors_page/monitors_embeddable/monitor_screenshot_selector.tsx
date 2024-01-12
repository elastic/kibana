/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent, useCallback, useEffect, useState } from 'react';
import { Provider as ReduxProvider, useDispatch, useSelector } from 'react-redux';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { i18n } from '@kbn/i18n';

import { ConfigKey } from '../../../../../../common/constants/monitor_management';
import { SyntheticsMonitor } from '../../../../../../common/runtime_types';
import { initKibanaService, isKibanaServiceInitialized } from '../../../synthetics_app';

import { SyntheticsRefreshContextProvider } from '../../../contexts';
import { store, selectServiceLocationsState } from '../../../state';
import { getServiceLocations } from '../../../state/service_locations';
import { useEnablement } from '../../../hooks';
import { useMonitorList } from '../hooks/use_monitor_list';
import { DisabledCallout } from '../management/disabled_callout';

import { usePersistSelectorState } from './use_persist_selector_state';
import { LocationSelect } from './location_select';
import { MonitorSelect } from './monitor_select';
import { ResolutionSlider } from './resolution_slider';
import { GetImage } from './get_image';
import { MonitorSelectorState, initialMonitorSelectorState } from './models';

function MonitorScreenshotSelectorEmbeddable({
  basePath,
  onScreenshotCapture,
}: {
  basePath: CoreStart['http']['basePath'];
  onScreenshotCapture: ({
    url,
    minWidth,
    width,
    height,
  }: {
    url: string;
    minWidth: number;
    width: number;
    height: number;
  }) => void;
}) {
  const [persistedState, setPersistedState] = usePersistSelectorState();
  const [componentState, setComponentState] = useState<MonitorSelectorState>(
    persistedState ?? initialMonitorSelectorState
  );

  const [checkGroupIdsCache, setCheckGroupIdsCache] = useLocalStorage<Record<string, string>>(
    'xpack.synthetics.monitorCheckGroupIds',
    {}
  );
  const checkGroupIdCacheKey = `${JSON.stringify(componentState)}`;
  const cachedCheckGroupId = checkGroupIdsCache?.[checkGroupIdCacheKey];
  const [checkGroupId, setCheckGroupId] = useState<string | undefined>(cachedCheckGroupId);

  const dispatch = useDispatch();
  const { loading: locationsLoading, locationsLoaded } = useSelector(selectServiceLocationsState);
  const { syntheticsMonitors, loading: monitorsLoading } = useMonitorList();

  const selectedMonitor = componentState.monitorId
    ? syntheticsMonitors?.find(
        (mon) => mon[ConfigKey.MONITOR_QUERY_ID] === componentState.monitorId
      )
    : undefined;
  const monitorEditUrl = componentState.monitorId
    ? basePath.prepend(`/app/synthetics/edit-monitor/${componentState.monitorId}`)
    : undefined;

  const setSelectedMonitor = useCallback(
    (monitorId: string) => {
      const monitor = syntheticsMonitors?.find(
        (mon) => mon[ConfigKey.MONITOR_QUERY_ID] === monitorId
      );
      if (monitor) {
        setComponentState((prevState) => ({
          ...getPersistedOrDefault(prevState),
          monitorId,
          locationId: monitor.locations?.[0].id,
        }));
      }
    },
    [setComponentState, syntheticsMonitors]
  );

  const monitorLocations = selectedMonitor?.locations ?? [];
  const setSelectedLocation = useCallback(
    (locationId: string) => {
      setComponentState((prevState) => ({
        ...getPersistedOrDefault(prevState),
        locationId,
      }));
    },
    [setComponentState]
  );

  const [wMin, wMax, height] = [componentState.wMin, componentState.wMax, componentState.height];
  const setSelectedResolution = useCallback(
    ([w1, w2, h]: [number, number, number]) => {
      setComponentState((prevState) => ({
        ...getPersistedOrDefault(prevState),
        wMin: w1,
        wMax: w2,
        height: h,
      }));
    },
    [setComponentState]
  );

  const handleDownloadClick = useCallback(
    (evt: MouseEvent<HTMLButtonElement>) => {
      // Reset checkGroupId so that a new test run is triggered
      if (checkGroupId) {
        setCheckGroupIdsCache((prevState) => {
          const { [checkGroupIdCacheKey]: toBeRemoved, ...rest } = prevState ?? {};
          return rest;
        });
        setCheckGroupId(undefined);
      } else {
        setCheckGroupId('placeholder-check-group');
        setTimeout(() => {
          setCheckGroupId(undefined); // To trigger change
        }, 500);
      }
    },
    [setCheckGroupIdsCache, checkGroupIdCacheKey, setCheckGroupId, checkGroupId]
  );

  const handleCheckGroupIdRetrieved = useCallback(
    (newCheckGroupId: string) => {
      setCheckGroupIdsCache((prevState) => {
        return {
          ...prevState,
          [checkGroupIdCacheKey]: newCheckGroupId,
        };
      });
      setCheckGroupId(newCheckGroupId);
    },
    [checkGroupIdCacheKey, setCheckGroupIdsCache]
  );

  const handleScreenshotUrlCapture = useCallback(
    (screenshotUrl: string) => {
      onScreenshotCapture({ url: screenshotUrl, minWidth: wMin, width: wMax, height });
    },
    [onScreenshotCapture, wMin, wMax, height]
  );

  useEffect(() => {
    if (!locationsLoading && !locationsLoaded) {
      dispatch(getServiceLocations());
    }
  }, [dispatch, locationsLoaded, locationsLoading]);

  useEffect(() => {
    setPersistedState(componentState);
  }, [componentState, setPersistedState]);

  // On state change, check if there's a cached checkGroupId
  useEffect(() => {
    if (cachedCheckGroupId && cachedCheckGroupId !== checkGroupId) {
      setCheckGroupId(cachedCheckGroupId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkGroupIdCacheKey]);

  useEnablement();

  return (
    <>
      <DisabledCallout total={syntheticsMonitors.length} />
      <EuiFlexGroup gutterSize="l" wrap alignItems="center">
        <EuiFlexGroup gutterSize="m" wrap>
          <EuiFlexItem css={{ minWidth: 300 }}>
            <MonitorSelect
              monitors={syntheticsMonitors}
              monitorsLoading={monitorsLoading}
              selectedMonitor={componentState.monitorId}
              setSelectedMonitor={setSelectedMonitor}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={{ minWidth: 300 }}>
            <LocationSelect
              locations={monitorLocations}
              selectedLocationId={componentState.locationId}
              setSelectedLocation={setSelectedLocation}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={true} css={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            {componentState.monitorId ? (
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
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup gutterSize="m" wrap>
          <EuiFlexItem grow={false} style={{ minWidth: 600 }}>
            <ResolutionSlider
              min={wMin}
              max={wMax}
              height={height}
              onResolutionChange={setSelectedResolution}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={true} css={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            <GetImage
              basePath={basePath}
              checkGroupId={checkGroupId}
              monitor={selectedMonitor as SyntheticsMonitor}
              state={componentState}
              onClick={handleDownloadClick}
              onCheckGroupIdRetrieved={handleCheckGroupIdRetrieved}
              onImgUrlRetrieved={handleScreenshotUrlCapture}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </>
  );
}

export interface EmbeddableProps {
  coreStart: CoreStart;
  onScreenshotCapture: (captureProps: {
    url: string;
    minWidth: number;
    width: number;
    height: number;
  }) => void;
}

// eslint-disable-next-line import/no-default-export
export default function Embeddable({ coreStart, onScreenshotCapture }: EmbeddableProps) {
  useEffect(() => {
    initKibanaService({ coreStart });
  }, [coreStart]);

  if (!isKibanaServiceInitialized()) return null;

  return (
    <ReduxProvider store={store}>
      <SyntheticsRefreshContextProvider>
        <MonitorScreenshotSelectorEmbeddable
          basePath={coreStart.http.basePath}
          onScreenshotCapture={onScreenshotCapture}
        />
      </SyntheticsRefreshContextProvider>
    </ReduxProvider>
  );
}

function getPersistedOrDefault(persistedState?: MonitorSelectorState) {
  return {
    monitorId: persistedState?.monitorId ?? initialMonitorSelectorState.monitorId,
    locationId: persistedState?.locationId ?? initialMonitorSelectorState.locationId,
    wMin: persistedState?.wMin ?? initialMonitorSelectorState.wMin,
    wMax: persistedState?.wMax ?? initialMonitorSelectorState.wMax,
    height: persistedState?.height ?? initialMonitorSelectorState.height,
  } as MonitorSelectorState;
}
