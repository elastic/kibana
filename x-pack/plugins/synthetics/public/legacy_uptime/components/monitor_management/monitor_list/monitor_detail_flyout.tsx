/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import moment from 'moment';
import React, { useState } from 'react';
import styled from 'styled-components';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';
import { DecryptedSyntheticsMonitorSavedObject } from '../../../../../common/types';
import { fetchPings, getMonitor } from '../../../state/api';
import { ClientPluginsStart } from '../../../../plugin';
import { useStatusByLocation } from '../../../../apps/synthetics/hooks/use_status_by_location';

// TODO: remove any
const FlyoutHeadingTable = styled<any>(EuiBasicTable)`
  .euiTableRowCell {
    border-bottom: 1px solid transparent;
    border-top: 1px solid transparent;
  }
  .euiTable {
    width: inherit;
  }
`;

const BoldItem = styled(EuiFlexItem)`
  font-weight: bold;
`;

const STATUS_COLUMN_NAME = i18n.translate('xpack.synthetics.monitorList.statusColumnName', {
  defaultMessage: 'Status',
});

const LOCATION_COLUMN_NAME = i18n.translate('xpack.synthetics.monitorList.locationColumnName', {
  defaultMessage: 'Location',
});

const DURATION_HEADER_TEXT = i18n.translate('xpack.synthetics.monitorList.durationHeaderText', {
  defaultMessage: 'Duration',
});

const MONITOR_DETAILS_HEADER_TEXT = i18n.translate(
  'xpack.synthetics.monitorList.monitorDetailsHeaderText',
  {
    defaultMessage: 'Monitor Details',
  }
);

const ENABLED_ITEM_TEXT = i18n.translate('xpack.synthetics.monitorList.enabledItemText', {
  defaultMessage: 'Enabled',
});

const LOCATIONS_ITEM_TEXT = i18n.translate('xpack.synthetics.monitorList.locationsItemText', {
  defaultMessage: 'Locations',
});

const NAME_ITEM_TEXT = i18n.translate('xpack.synthetics.monitorList.nameItemText', {
  defaultMessage: 'Name',
});

const MONITOR_ID_ITEM_TEXT = i18n.translate('xpack.synthetics.monitorList.monitorIdItemText', {
  defaultMessage: 'Monitor ID',
});

const CLOSE_FLYOUT_TEXT = i18n.translate('xpack.synthetics.monitorList.closeFlyoutText', {
  defaultMessage: 'Cancel',
});

const GO_TO_MONITOR_LINK_TEXT = i18n.translate('xpack.synthetics.monitorList.goToMonitorLinkText', {
  defaultMessage: 'Go to monitor',
});
export function MonitorDetailFlyout(props: { id: string; location: string; onClose: () => void }) {
  const { id } = props;
  const theme = useEuiTheme();
  const [location, setLocation] = useState<string>(props.location);
  const { observability } = useKibana<ClientPluginsStart>().services;
  const { ExploratoryViewEmbeddable } = observability;
  const {
    data: monitorSavedObject,
    error,
    status,
  } = useFetcher<Promise<DecryptedSyntheticsMonitorSavedObject | undefined>>(
    () => getMonitor({ id }),
    [id]
  );
  const { data: detailData, status: detailStatus } = useFetcher(() => {
    return fetchPings({
      dateRange: { from: 'now-12h', to: 'now' },
      monitorId: id,
      locations: `["${location}"]`,
      size: 1,
    });
  }, [id, location]);
  const locationStatuses = useStatusByLocation(id);
  return (
    <EuiFlyout onClose={props.onClose}>
      {status === FETCH_STATUS.FAILURE && <EuiErrorBoundary>{error}</EuiErrorBoundary>}
      {status === FETCH_STATUS.LOADING && <EuiLoadingSpinner size="xl" />}
      {status === FETCH_STATUS.SUCCESS && (
        <>
          <EuiFlyoutHeader hasBorder>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiTitle>
                  <h2>{monitorSavedObject?.attributes.name}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonIcon iconType="popout" href={detailData?.pings[0].url?.full} />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <FlyoutHeadingTable
              columns={[
                {
                  name: STATUS_COLUMN_NAME,
                  field: 'monitor.status',
                  outerWidth: '100px',
                  render: (statusString: string) => (
                    <EuiBadge color={statusString === 'up' ? 'success' : 'danger'}>
                      {status}
                    </EuiBadge>
                  ),
                },
                {
                  name: LOCATION_COLUMN_NAME,
                  field: 'observer.geo.name',
                  render: () => (
                    <EuiSelect
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      options={
                        locationStatuses.locations?.map((l) => ({
                          value: l.observer?.geo?.name,
                          text: l.observer?.geo?.name,
                        })) ?? []
                      }
                    />
                  ),
                },
                {
                  name: 'Last run',
                  field: 'timestamp',
                  render: (item: string) => moment(item).fromNow(),
                },
              ]}
              items={detailData?.pings ?? []}
              loading={detailStatus === FETCH_STATUS.LOADING}
              pagination={undefined}
            />
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiTitle size="m">
              <h3>{DURATION_HEADER_TEXT}</h3>
            </EuiTitle>
            <ExploratoryViewEmbeddable
              customHeight={'200px'}
              reportType="kpi-over-time"
              axisTitlesVisibility={{ x: false, yRight: false, yLeft: false }}
              legendIsVisible={true}
              legendPosition="bottom"
              attributes={[
                {
                  seriesType: 'area',
                  color: theme.euiTheme.colors.success,
                  time: {
                    from: 'now-12h',
                    to: 'now',
                  },
                  reportDefinitions: {
                    'monitor.id': [id],
                    'observer.geo.name': [location],
                  },
                  dataType: 'synthetics',
                  selectedMetricField: 'monitor.duration.us',
                  name: 'All monitors response duration',
                },
                {
                  seriesType: 'line',
                  color: theme.euiTheme.colors.danger,
                  time: {
                    from: 'now-24h',
                    to: 'now-12h',
                  },
                  reportDefinitions: {
                    'monitor.id': [id],
                    'observer.geo.name': [location],
                  },
                  dataType: 'synthetics',
                  selectedMetricField: 'monitor.duration.us',
                  name: 'Previous period',
                },
              ]}
            />
            <EuiSpacer />
            <EuiTitle size="s">
              <h3>{MONITOR_DETAILS_HEADER_TEXT}</h3>
            </EuiTitle>
            <EuiSpacer />
            <EuiFlexGroup>
              <BoldItem>{ENABLED_ITEM_TEXT}</BoldItem>
              <EuiFlexItem>
                <EuiSwitch
                  checked={!!monitorSavedObject?.attributes.enabled}
                  label=""
                  onChange={(e) => {
                    throw Error('Not implemented');
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <BoldItem>{LOCATIONS_ITEM_TEXT}</BoldItem>
              <EuiFlexItem>
                {locationStatuses.loading === false && (
                  <EuiFlexGroup alignItems="center" gutterSize="none">
                    {/* TODO: Extract to another function */}
                    {locationStatuses.locations.map((locationStatus) => (
                      <EuiFlexItem grow={false}>
                        <EuiBadge
                          color={locationStatus.monitor.status === 'up' ? 'hollow' : 'default'}
                        >
                          <EuiHealth
                            color={locationStatus.monitor.status === 'up' ? 'success' : 'danger'}
                            textSize="xs"
                          >
                            {locationStatus.observer?.geo?.name}
                          </EuiHealth>
                        </EuiBadge>
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <BoldItem>{NAME_ITEM_TEXT}</BoldItem>
              <EuiFlexItem>{monitorSavedObject?.attributes.name}</EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexGroup>
              <BoldItem>{MONITOR_ID_ITEM_TEXT}</BoldItem>
              <EuiFlexItem>{monitorSavedObject?.id}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty>{CLOSE_FLYOUT_TEXT}</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {/* TODO: Link to monitor */}
                <EuiButton fill iconType="popout">
                  {GO_TO_MONITOR_LINK_TEXT}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </>
      )}
    </EuiFlyout>
  );
}
