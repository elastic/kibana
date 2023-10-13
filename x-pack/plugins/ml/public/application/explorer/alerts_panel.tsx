/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBasicTableColumn,
  EuiInMemoryTable,
  EuiNotificationBadge,
  EuiSpacer,
} from '@elastic/eui';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import useObservable from 'react-use/lib/useObservable';
import { Axis, Chart, LineSeries, Position, ScaleType, Settings } from '@elastic/charts';
import { CollapsiblePanel } from '../components/collapsible_panel';
import { AnomalyDetectionAlert } from './anomaly_detection_alerts_state_service';
import { useFieldFormatter } from '../contexts/kibana';
import { useAnomalyExplorerContext } from './anomaly_explorer_context';
import { Y_AXIS_LABEL_WIDTH } from './swimlane_annotation_container';

export const AlertsPanel: FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);
  const durationFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DURATION);

  const { anomalyTimelineStateService, anomalyDetectionAlertsStateService } =
    useAnomalyExplorerContext();

  const alertsData = useObservable(anomalyDetectionAlertsStateService.anomalyDetectionAlerts$);
  const selectedAlertsData = useObservable(anomalyDetectionAlertsStateService.selectedAlerts$);
  const countByStatus = useObservable(anomalyDetectionAlertsStateService.countByStatus$);

  const annotationXDomain = useObservable(anomalyTimelineStateService.timeDomain$);

  const swimlaneContainerWidth = useObservable(
    anomalyTimelineStateService.getContainerWidth$(),
    anomalyTimelineStateService.getContainerWidth()
  );

  const columns: Array<EuiBasicTableColumn<AnomalyDetectionAlert>> = [
    {
      field: 'ruleName',
      name: 'Rule name',
      sortable: true,
      truncateText: false,
    },
    {
      field: 'jobId',
      name: 'Job ID',
      sortable: true,
      truncateText: false,
    },
    {
      field: 'anomalyTimestamp',
      name: 'Anomaly time',
      sortable: true,
      truncateText: false,
      render: (value: number) => dateFormatter(value),
    },
    {
      field: 'timestamp',
      name: 'Triggered at',
      sortable: true,
      truncateText: false,
      render: (value: number) => dateFormatter(value),
    },
    {
      name: 'Duration',
      truncateText: false,
      render: (value: AnomalyDetectionAlert) =>
        durationFormatter(value.end_timestamp - value.timestamp),
    },
  ];

  const yValueMap: Record<string, number> = {};
  const chartData = alertsData
    ?.map((alert, i) => {
      if (!yValueMap.hasOwnProperty(alert.ruleName)) {
        yValueMap[alert.ruleName] = Math.max(...Object.values(yValueMap), 0) + 1;
      }
      const yV = yValueMap[alert.ruleName];
      return [
        // null is required to make isolated points
        [alert.timestamp, null, alert.ruleName],
        [alert.timestamp, yV, alert.ruleName],
        [alert.end_timestamp, yV, alert.ruleName],
      ];
    })
    .flat();

  return (
    <>
      <CollapsiblePanel
        isOpen={isOpen}
        onToggle={setIsOpen}
        header={
          <FormattedMessage id="xpack.ml.explorer.alertsPanel.header" defaultMessage="Alerts" />
        }
        headerItems={Object.entries(countByStatus ?? {}).map(([status, count]) => {
          return (
            <>
              {status}{' '}
              <EuiNotificationBadge size="m" color={count > 0 ? 'accent' : 'subdued'}>
                {count}
              </EuiNotificationBadge>
            </>
          );
        })}
      >
        <div style={{ height: '60px', width: '100%', paddingLeft: `${Y_AXIS_LABEL_WIDTH}px` }}>
          <Chart title={''} description={''}>
            <Settings xDomain={annotationXDomain!} />
            <LineSeries
              id={'test'}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor={0}
              yAccessors={[1]}
              splitSeriesAccessors={[2]}
              data={chartData!}
            />
            <Axis
              id="x"
              position={Position.Bottom}
              style={{
                tickLine: { size: 0.0001, padding: 4 },
                tickLabel: {
                  alignment: { horizontal: Position.Left, vertical: Position.Bottom },
                  padding: 0,
                  offset: { x: 0, y: 0 },
                },
              }}
              timeAxisLayerCount={2}
              gridLine={{
                visible: true,
              }}
            />
          </Chart>
        </div>

        {selectedAlertsData && selectedAlertsData.length > 0 ? (
          <EuiInMemoryTable columns={columns} items={selectedAlertsData} />
        ) : null}
      </CollapsiblePanel>
      <EuiSpacer size="m" />
    </>
  );
};
