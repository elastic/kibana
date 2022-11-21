/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { Chart, Settings, Metric, MetricTrendShape } from '@elastic/charts';
import { EuiPanel } from '@elastic/eui';
import { DARK_THEME } from '@elastic/charts';
import { useTheme } from '@kbn/observability-plugin/public';
import { useLocationName, useStatusByLocation } from '../../../../hooks';
import { formatDuration } from '../../../../utils/formatting';
import { MonitorOverviewItem, Ping } from '../../../../../../../common/runtime_types';
import { ActionsPopover } from './actions_popover';
import { OverviewGridItemLoader } from './overview_grid_item_loader';

export const getColor = (theme: ReturnType<typeof useTheme>, isEnabled: boolean, ping?: Ping) => {
  if (!isEnabled) {
    return theme.eui.euiColorLightestShade;
  }
  return (ping?.summary?.down || 0) > 0
    ? theme.eui.euiColorVis9_behindText
    : theme.eui.euiColorVis0_behindText;
};

export const MetricItem = ({
  monitor,
  averageDuration,
  data,
  loaded,
  onClick,
}: {
  monitor: MonitorOverviewItem;
  data: Array<{ x: number; y: number }>;
  averageDuration: number;
  loaded: boolean;
  onClick: (params: { id: string; configId: string; location: string }) => void;
}) => {
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const locationName = useLocationName({ locationId: monitor.location?.id });
  const { locations } = useStatusByLocation(monitor.configId);
  const ping = locations.find((loc) => loc.observer?.geo?.name === locationName);
  const theme = useTheme();

  return (
    <div data-test-subj={`${monitor.name}-metric-item`} style={{ height: '160px' }}>
      {loaded ? (
        <EuiPanel
          paddingSize="none"
          onMouseOver={() => {
            if (!isMouseOver) {
              setIsMouseOver(true);
            }
          }}
          onMouseLeave={() => {
            if (isMouseOver) {
              setIsMouseOver(false);
            }
          }}
          style={{
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <Chart>
            <Settings
              onElementClick={() =>
                monitor.configId &&
                locationName &&
                onClick({ configId: monitor.configId, id: monitor.id, location: locationName })
              }
              baseTheme={DARK_THEME}
            />
            <Metric
              id={`${monitor.configId}-${monitor.location?.id}`}
              data={[
                [
                  {
                    title: monitor.name,
                    subtitle: locationName,
                    value: averageDuration,
                    trendShape: MetricTrendShape.Area,
                    trend: data,
                    extra: (
                      <span>
                        {i18n.translate('xpack.synthetics.overview.duration.label', {
                          defaultMessage: 'Duration Avg.',
                        })}
                      </span>
                    ),
                    valueFormatter: (d: number) => formatDuration(d),
                    color: getColor(theme, monitor.isEnabled, ping),
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
            />
          )}
        </EuiPanel>
      ) : (
        <OverviewGridItemLoader />
      )}
    </div>
  );
};
