/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import { SavedObject } from '@kbn/core/public';
import { FetcherResult } from '@kbn/observability-plugin/public/hooks/use_fetcher';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@kbn/observability-plugin/public';
import { MonitorDetailsPanel } from '../../../common/components/monitor_details_panel';
import { ClientPluginsStart } from '../../../../../../plugin';
import { LocationsStatus, useStatusByLocation } from '../../../../hooks/use_status_by_location';
import { MonitorEnabled } from '../../management/monitor_list_table/monitor_enabled';
import { ActionsPopover } from './actions_popover';
import {
  selectMonitorUpsertStatus,
  selectOverviewState,
  selectServiceLocationsState,
  setFlyoutConfig,
} from '../../../../state';
import { useMonitorDetail } from '../../../../hooks/use_monitor_detail';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  MonitorOverviewItem,
  SyntheticsMonitor,
} from '../types';
import { useMonitorDetailLocator } from '../../hooks/use_monitor_detail_locator';
import { fetchSyntheticsMonitor } from '../../../../state/overview/api';
import { MonitorStatus } from '../../../common/components/monitor_status';
import { MonitorLocationSelect } from '../../../common/components/monitor_location_select';

interface Props {
  configId: string;
  id: string;
  location: string;
  locationId: string;
  onClose: () => void;
  onEnabledChange: () => void;
  onLocationChange: (params: {
    configId: string;
    id: string;
    location: string;
    locationId: string;
  }) => void;
  currentDurationChartFrom?: string;
  currentDurationChartTo?: string;
  previousDurationChartFrom?: string;
  previousDurationChartTo?: string;
}

const DEFAULT_DURATION_CHART_FROM = 'now-12h';
const DEFAULT_CURRENT_DURATION_CHART_TO = 'now';
const DEFAULT_PREVIOUS_DURATION_CHART_FROM = 'now-24h';
const DEFAULT_PREVIOUS_DURATION_CHART_TO = 'now-12h';

function DetailFlyoutDurationChart({
  id,
  location,
  currentDurationChartFrom,
  currentDurationChartTo,
  previousDurationChartFrom,
  previousDurationChartTo,
}: Pick<
  Props,
  | 'id'
  | 'location'
  | 'currentDurationChartFrom'
  | 'currentDurationChartTo'
  | 'previousDurationChartFrom'
  | 'previousDurationChartTo'
>) {
  const theme = useTheme();

  const { observability } = useKibana<ClientPluginsStart>().services;
  const { ExploratoryViewEmbeddable } = observability;
  return (
    <EuiPageSection bottomBorder="extended">
      <EuiTitle size="xs">
        <h3>{DURATION_HEADER_TEXT}</h3>
      </EuiTitle>
      <ExploratoryViewEmbeddable
        customHeight="200px"
        reportType="kpi-over-time"
        axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
        legendIsVisible={true}
        legendPosition="bottom"
        attributes={[
          {
            seriesType: 'area',
            color: theme?.eui?.euiColorVis1,
            time: {
              from: currentDurationChartFrom ?? DEFAULT_DURATION_CHART_FROM,
              to: currentDurationChartTo ?? DEFAULT_CURRENT_DURATION_CHART_TO,
            },
            reportDefinitions: {
              'monitor.id': [id],
              'observer.geo.name': [location],
            },
            filters: [
              {
                field: 'observer.geo.name',
                values: [location],
              },
            ],
            dataType: 'synthetics',
            selectedMetricField: 'monitor.duration.us',
            name: DURATION_SERIES_NAME,
            operationType: 'average',
          },
          {
            seriesType: 'line',
            color: theme?.eui?.euiColorVis7,
            time: {
              from: previousDurationChartFrom ?? DEFAULT_PREVIOUS_DURATION_CHART_FROM,
              to: previousDurationChartTo ?? DEFAULT_PREVIOUS_DURATION_CHART_TO,
            },
            reportDefinitions: {
              'monitor.id': [id],
              'observer.geo.name': [location],
            },
            filters: [
              {
                field: 'observer.geo.name',
                values: [location],
              },
            ],
            dataType: 'synthetics',
            selectedMetricField: 'monitor.duration.us',
            name: PREVIOUS_PERIOD_SERIES_NAME,
            operationType: 'average',
          },
        ]}
      />
    </EuiPageSection>
  );
}

function DetailedFlyoutHeader({
  locations,
  currentLocation,
  configId,
  setCurrentLocation,
  monitor,
  onEnabledChange,
}: {
  locations: LocationsStatus;
  currentLocation: string;
  configId: string;
  monitor: EncryptedSyntheticsMonitor;
  onEnabledChange: () => void;
  setCurrentLocation: (location: string, locationId: string) => void;
}) {
  const status = locations.find((l) => l.label === currentLocation)?.status;
  const { locations: allLocations } = useSelector(selectServiceLocationsState);

  const selectedLocation = allLocations.find((ll) => ll.label === currentLocation);

  return (
    <EuiFlexGroup wrap={true} responsive={false}>
      <EuiFlexItem grow={false}>
        <MonitorStatus status={status} monitor={monitor} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <MonitorLocationSelect
          compressed
          monitorLocations={monitor.locations}
          configId={configId}
          selectedLocation={selectedLocation}
          onChange={useCallback(
            (id, label) => {
              if (currentLocation !== label) setCurrentLocation(label, id);
            },
            [currentLocation, setCurrentLocation]
          )}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiDescriptionList align="left" compressed>
          <EuiDescriptionListTitle>{ENABLED_ITEM_TEXT}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <MonitorEnabled configId={configId} monitor={monitor} reloadPage={onEnabledChange} />
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function LoadingState() {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function MonitorDetailFlyout(props: Props) {
  const { id, configId, onLocationChange, locationId } = props;
  const {
    data: { monitors },
  } = useSelector(selectOverviewState);

  const monitor: MonitorOverviewItem | undefined = useMemo(() => {
    const overviewItem = monitors.filter(({ id: overviewItemId }) => overviewItemId === id)[0];
    if (overviewItem) return overviewItem;
  }, [id, monitors]);

  const setLocation = useCallback(
    (location: string, locationIdT: string) =>
      onLocationChange({ id, configId, location, locationId: locationIdT }),
    [id, configId, onLocationChange]
  );

  const detailLink = useMonitorDetailLocator({
    configId,
    locationId,
  });

  const dispatch = useDispatch();

  useEffect(() => {
    return () => {
      dispatch(setFlyoutConfig(null));
    };
  }, [dispatch]);

  const upsertStatus = useSelector(selectMonitorUpsertStatus(configId));

  const upsertSuccess = upsertStatus?.status === 'success';

  const {
    data: monitorSavedObject,
    error,
    status,
    loading,
  }: FetcherResult<SavedObject<SyntheticsMonitor>> = useFetcher(
    () => fetchSyntheticsMonitor(configId),
    [configId, upsertSuccess]
  );

  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

  const monitorDetail = useMonitorDetail(configId, props.location);
  const { locations } = useStatusByLocation({
    configId,
    monitorLocations: monitorSavedObject?.attributes.locations,
  });

  const isOverlay = useIsWithinMaxBreakpoint('xl');

  return (
    <EuiFlyout
      size="600px"
      type={isOverlay ? 'overlay' : 'push'}
      onClose={props.onClose}
      paddingSize="none"
    >
      {status === FETCH_STATUS.FAILURE && <EuiErrorBoundary>{error?.message}</EuiErrorBoundary>}
      {status === FETCH_STATUS.LOADING && <LoadingState />}
      {status === FETCH_STATUS.SUCCESS && monitorSavedObject && (
        <>
          <EuiFlyoutHeader hasBorder>
            <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
              <EuiFlexGroup responsive={false} gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="s">
                    <h2>{monitorSavedObject?.attributes[ConfigKey.NAME]}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  {monitor && (
                    <ActionsPopover
                      isPopoverOpen={isActionsPopoverOpen}
                      isInspectView
                      monitor={monitor}
                      setIsPopoverOpen={setIsActionsPopoverOpen}
                      position="default"
                      iconHasPanel={false}
                      iconSize="xs"
                    />
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <DetailedFlyoutHeader
                currentLocation={props.location}
                locations={locations}
                setCurrentLocation={setLocation}
                configId={configId}
                monitor={monitorSavedObject.attributes}
                onEnabledChange={props.onEnabledChange}
              />
            </EuiPanel>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <DetailFlyoutDurationChart {...props} location={props.location} />
            <MonitorDetailsPanel
              hideEnabled
              latestPing={monitorDetail.data}
              configId={configId}
              monitor={{
                ...monitorSavedObject.attributes,
                id: monitorSavedObject.id,
                updated_at: monitorSavedObject.updated_at!,
                created_at: monitorSavedObject.created_at!,
              }}
              loading={Boolean(loading)}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l" color="transparent">
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={props.onClose}>{CLOSE_FLYOUT_TEXT}</EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    // `detailLink` can be undefined, in this case, disable the button
                    isDisabled={!detailLink}
                    href={detailLink}
                    iconType="sortRight"
                    iconSide="right"
                    fill
                  >
                    {GO_TO_MONITOR_LINK_TEXT}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlyoutFooter>
        </>
      )}
    </EuiFlyout>
  );
}

const DURATION_HEADER_TEXT = i18n.translate('xpack.synthetics.monitorList.durationHeaderText', {
  defaultMessage: 'Duration',
});

const DURATION_SERIES_NAME = i18n.translate(
  'xpack.synthetics.monitorList.durationChart.durationSeriesName',
  {
    defaultMessage: 'Duration',
  }
);

const PREVIOUS_PERIOD_SERIES_NAME = i18n.translate(
  'xpack.synthetics.monitorList.durationChart.previousPeriodSeriesName',
  {
    defaultMessage: 'Previous period',
  }
);

const ENABLED_ITEM_TEXT = i18n.translate('xpack.synthetics.monitorList.enabledItemText', {
  defaultMessage: 'Enabled',
});

const CLOSE_FLYOUT_TEXT = i18n.translate('xpack.synthetics.monitorList.closeFlyoutText', {
  defaultMessage: 'Close',
});

const GO_TO_MONITOR_LINK_TEXT = i18n.translate('xpack.synthetics.monitorList.goToMonitorLinkText', {
  defaultMessage: 'Go to monitor',
});
