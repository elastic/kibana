/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { Chart, Settings, Metric, MetricTrendShape } from '@elastic/charts';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { DARK_THEME } from '@elastic/charts';
import { useTheme } from '@kbn/observability-shared-plugin/public';
import moment from 'moment';
import { useSelector, useDispatch } from 'react-redux';

import { MetricItemBody } from './metric_item/metric_item_body';
import {
  selectErrorPopoverState,
  selectOverviewTrends,
  toggleErrorPopoverOpen,
} from '../../../../state';
import { useLocationName, useStatusByLocationOverview } from '../../../../hooks';
import { formatDuration } from '../../../../utils/formatting';
import {
  OverviewPendingStatusMetaData,
  OverviewStatusMetaData,
} from '../../../../../../../common/runtime_types';
import { ActionsPopover } from './actions_popover';
import {
  hideTestNowFlyoutAction,
  manualTestRunInProgressSelector,
  toggleTestNowFlyoutAction,
} from '../../../../state/manual_test_runs';
import { MetricItemIcon } from './metric_item_icon';
import { MetricItemExtra } from './metric_item/metric_item_extra';

const METRIC_ITEM_HEIGHT = 160;

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
  onClick,
  style,
}: {
  monitor: OverviewStatusMetaData | OverviewPendingStatusMetaData;
  style?: React.CSSProperties;
  onClick: (params: { id: string; configId: string; location: string; locationId: string }) => void;
}) => {
  const trendData = useSelector(selectOverviewTrends)[monitor.configId + monitor.locationId];
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isErrorPopoverOpen = useSelector(selectErrorPopoverState);
  const locationName = useLocationName(monitor);
  const { status, timestamp, ping, configIdByLocation } = useStatusByLocationOverview({
    configId: monitor.configId,
    locationId: monitor.locationId,
  });
  const theme = useTheme();

  const testInProgress = useSelector(manualTestRunInProgressSelector(monitor.configId));

  const dispatch = useDispatch();

  return (
    <div
      data-test-subj={`${monitor.name}-${monitor.locationId}-metric-item`}
      style={style ?? { height: METRIC_ITEM_HEIGHT }}
    >
      <EuiPanel
        data-test-subj={`${monitor.name}-metric-item-${locationName}-${status}`}
        paddingSize="none"
        onMouseLeave={() => {
          if (isErrorPopoverOpen) {
            dispatch(toggleErrorPopoverOpen(null));
          }
        }}
        css={css`
          height: 100%;
          overflow: hidden;
          position: relative;

          & .cardItemActions_hover {
            pointer-events: none;
            opacity: 0;
            &:focus-within {
              pointer-events: auto;
              opacity: 1;
            }
          }
          &:hover .cardItemActions_hover {
            pointer-events: auto;
            opacity: 1;
          }
        `}
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
                  id: monitor.configId,
                  location: locationName,
                  locationId: monitor.locationId,
                });
              }
            }}
            // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
            baseTheme={DARK_THEME}
            locale={i18n.getLocale()}
          />
          <Metric
            id={`${monitor.configId}-${monitor.locationId}`}
            data={[
              [
                {
                  title: monitor.name,
                  subtitle: locationName,
                  value: trendData !== 'loading' ? trendData?.median ?? 0 : 0,
                  trendShape: MetricTrendShape.Area,
                  trend: trendData !== 'loading' && !!trendData?.data ? trendData.data : [],
                  extra:
                    trendData !== 'loading' && !!trendData ? (
                      <MetricItemExtra
                        stats={{
                          medianDuration: trendData.median,
                          minDuration: trendData.min,
                          maxDuration: trendData.max,
                          avgDuration: trendData.avg,
                        }}
                      />
                    ) : trendData === 'loading' ? (
                      <div>
                        <FormattedMessage
                          defaultMessage="Loading metrics"
                          id="xpack.synthetics.overview.metricItem.loadingMessage"
                        />
                      </div>
                    ) : undefined,
                  valueFormatter: (d: number) => formatDuration(d),
                  color: getColor(theme, monitor.isEnabled, status),
                  body: <MetricItemBody monitor={monitor} />,
                },
              ],
            ]}
          />
        </Chart>
        <div className={isPopoverOpen ? '' : 'cardItemActions_hover'}>
          <ActionsPopover
            monitor={monitor}
            isPopoverOpen={isPopoverOpen}
            setIsPopoverOpen={setIsPopoverOpen}
            position="relative"
            locationId={monitor.locationId}
          />
        </div>
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
      <EuiSpacer size="s" />
    </div>
  );
};
