/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiNotificationBadge, EuiSpacer } from '@elastic/eui';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import useObservable from 'react-use/lib/useObservable';
import { Axis, Chart, LineSeries, Position, ScaleType, Settings } from '@elastic/charts';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { ML_ALERTS_CONFIG_ID } from '../../alerting/anomaly_detection_alerts_table/register_alerts_table_configuration';
import { CollapsiblePanel } from '../components/collapsible_panel';
import { useFieldFormatter, useMlKibana } from '../contexts/kibana';
import { useAnomalyExplorerContext } from './anomaly_explorer_context';
import { Y_AXIS_LABEL_WIDTH } from './swimlane_annotation_container';

export const AlertsPanel: FC = () => {
  const {
    services: { triggersActionsUi },
  } = useMlKibana();

  const [isOpen, setIsOpen] = useState(true);
  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);

  const { anomalyTimelineStateService, anomalyDetectionAlertsStateService } =
    useAnomalyExplorerContext();

  const alertsData = useObservable(anomalyDetectionAlertsStateService.anomalyDetectionAlerts$);
  const countByStatus = useObservable(anomalyDetectionAlertsStateService.countByStatus$);
  const alertsQuery = useObservable(anomalyDetectionAlertsStateService.alertsQuery$, {});

  const annotationXDomain = useObservable(anomalyTimelineStateService.timeDomain$);

  const alertStateProps = {
    alertsTableConfigurationRegistry: triggersActionsUi!.alertsTableConfigurationRegistry,
    configurationId: ML_ALERTS_CONFIG_ID,
    id: `ml-details-alerts`,
    featureIds: [AlertConsumers.ML],
    query: alertsQuery,
    showExpandToDetails: true,
    showAlertStatusWithFlapping: true,
  };
  const alertsStateTable = triggersActionsUi!.getAlertsStateTable(alertStateProps);

  const yValueMap: Record<string, number> = {};
  const chartData = alertsData
    ?.map((alert, i) => {
      if (!yValueMap.hasOwnProperty(alert.ruleName)) {
        yValueMap[alert.ruleName] = Math.max(...Object.values(yValueMap), -1) + 1;
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
        <div
          style={{
            height: `${Object.keys(yValueMap).length * 40}px`,
            width: '100%',
            paddingLeft: `${Y_AXIS_LABEL_WIDTH}px`,
          }}
        >
          <Chart>
            <Settings xDomain={annotationXDomain!} />
            <LineSeries
              id={'test'}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor={0}
              yAccessors={[1]}
              splitSeriesAccessors={[2]}
              data={chartData!}
              y0AccessorFormat={(d) => '-'}
            />
            <Axis
              id="x"
              position={Position.Bottom}
              tickFormat={(v) => dateFormatter(v)}
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
            <Axis id="left" position={Position.Left} tickFormat={(d) => ``} />
          </Chart>
        </div>

        {alertsStateTable}
      </CollapsiblePanel>
      <EuiSpacer size="m" />
    </>
  );
};
