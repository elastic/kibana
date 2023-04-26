/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { Chart, Settings, Metric, MetricTrendShape } from '@elastic/charts';
import { EuiPanel, EuiIconTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DARK_THEME } from '@elastic/charts';
import { useTheme } from '@kbn/observability-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { selectErrorPopoverState, toggleErrorPopoverOpen } from '../../../../state';
import { useLocationName, useStatusByLocationOverview } from '../../../../hooks';
import { formatDuration } from '../../../../utils/formatting';
import { MonitorOverviewItem } from '../../../../../../../common/runtime_types';
import { ActionsPopover } from './actions_popover';
import {
  hideTestNowFlyoutAction,
  manualTestRunInProgressSelector,
  toggleTestNowFlyoutAction,
} from '../../../../state/manual_test_runs';
import { MetricItemIcon } from './metric_item_icon';

export const getColor = (
  theme: ReturnType<typeof useTheme>,
  isEnabled: boolean,
  status?: string
) => {
  if (!isEnabled) {
    return theme.eui.euiColorLightestShade;
  }
  switch (status) {
    case 'down':
      return theme.eui.euiColorVis9_behindText;
    case 'up':
      return theme.eui.euiColorVis0_behindText;
    case 'unknown':
      return theme.eui.euiColorGhost;
    default:
      return theme.eui.euiColorVis0_behindText;
  }
};

export const MetricItem = ({
  monitor,
  medianDuration,
  maxDuration,
  minDuration,
  avgDuration,
  data,
  onClick,
}: {
  monitor: MonitorOverviewItem;
  data: Array<{ x: number; y: number }>;
  medianDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  onClick: (params: { id: string; configId: string; location: string; locationId: string }) => void;
}) => {
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isErrorPopoverOpen = useSelector(selectErrorPopoverState);
  const locationName =
    useLocationName({ locationId: monitor.location?.id })?.label || monitor.location?.id;
  const { status, timestamp, ping, configIdByLocation } = useStatusByLocationOverview(
    monitor.configId,
    locationName
  );
  const theme = useTheme();

  const testInProgress = useSelector(manualTestRunInProgressSelector(monitor.configId));

  const dispatch = useDispatch();

  return (
    <div data-test-subj={`${monitor.name}-metric-item`} style={{ height: '160px' }}>
      <EuiPanel
        data-test-subj={`${monitor.name}-metric-item-${locationName}-${status}`}
        paddingSize="none"
        onMouseOver={() => {
          if (!isMouseOver) {
            setIsMouseOver(true);
          }
        }}
        onMouseLeave={() => {
          if (isErrorPopoverOpen) {
            dispatch(toggleErrorPopoverOpen(null));
          }
          if (isMouseOver) {
            setIsMouseOver(false);
          }
        }}
        style={{
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
        title={moment(timestamp).format('LLL')}
      >
        <Chart>
          <Settings
            onElementClick={() => {
              if (testInProgress) {
                dispatch(toggleTestNowFlyoutAction(monitor.configId));
                dispatch(toggleErrorPopoverOpen(null));
              } else {
                dispatch(hideTestNowFlyoutAction());
                dispatch(toggleErrorPopoverOpen(null));
              }
              if (!testInProgress && locationName) {
                onClick({
                  configId: monitor.configId,
                  id: monitor.id,
                  location: locationName,
                  locationId: monitor.location?.id,
                });
              }
            }}
            baseTheme={DARK_THEME}
          />
          <Metric
            id={`${monitor.configId}-${monitor.location?.id}`}
            data={[
              [
                {
                  title: monitor.name,
                  subtitle: locationName,
                  value: medianDuration,
                  trendShape: MetricTrendShape.Area,
                  trend: data,
                  extra: (
                    <EuiFlexGroup
                      alignItems="center"
                      gutterSize="xs"
                      justifyContent="flexEnd"
                      // empty title to prevent default title from showing
                      title=""
                    >
                      <EuiFlexItem grow={false}>
                        {i18n.translate('xpack.synthetics.overview.duration.label', {
                          defaultMessage: 'Duration',
                        })}
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIconTip
                          title={i18n.translate('xpack.synthetics.overview.duration.description', {
                            defaultMessage: 'Median duration of last 24 checks',
                          })}
                          content={i18n.translate(
                            'xpack.synthetics.overview.duration.description.values',
                            {
                              defaultMessage: 'Avg: {avg}, Min: {min}, Max: {max}',
                              values: {
                                avg: formatDuration(avgDuration, { noSpace: true }),
                                min: formatDuration(minDuration, { noSpace: true }),
                                max: formatDuration(maxDuration, { noSpace: true }),
                              },
                            }
                          )}
                          position="top"
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                  valueFormatter: (d: number) => formatDuration(d),
                  color: getColor(theme, monitor.isEnabled, status),
                },
              ],
            ]}
          />
        </Chart>
        {(isMouseOver || isPopoverOpen) && (
          <ActionsPopover
            monitor={monitor}
            isPopoverOpen={isPopoverOpen}
            setIsPopoverOpen={setIsPopoverOpen}
            position="relative"
            locationId={monitor.location.id}
          />
        )}
        {configIdByLocation && (
          <MetricItemIcon
            monitor={monitor}
            status={status}
            ping={ping}
            timestamp={timestamp}
            configIdByLocation={configIdByLocation}
          />
        )}
      </EuiPanel>
    </div>
  );
};
