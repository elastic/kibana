/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer } from '@elastic/eui';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { CollapsiblePanel } from '../components/collapsible_panel';
import { MlTooltipComponent, TooltipData } from '../components/chart_tooltip';
import { AnnotationTimeline } from './annotation_timeline';
import { AnomalyDetectionAlert } from './anomaly_detection_alerts_state_service';
import { useFieldFormatter } from '../contexts/kibana';
import { useAnomalyExplorerContext } from './anomaly_explorer_context';

export const AlertsPanel: FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);
  const durationLabel = i18n.translate('xpack.ml.explorer.alerts.alertsDuration', {
    defaultMessage: 'Duration',
  });
  const { anomalyTimelineStateService, anomalyDetectionAlertsStateService } =
    useAnomalyExplorerContext();

  const alertsData = useObservable(anomalyDetectionAlertsStateService.anomalyDetectionAlerts$);
  const annotationXDomain = useObservable(anomalyTimelineStateService.timeDomain$);

  const swimlaneContainerWidth = useObservable(
    anomalyTimelineStateService.getContainerWidth$(),
    anomalyTimelineStateService.getContainerWidth()
  );

  const anomalyTimeLabel = i18n.translate('xpack.ml.explorer.alerts.alertAnomalyTime', {
    defaultMessage: 'Anomaly time',
  });

  return (
    <>
      <CollapsiblePanel
        isOpen={isOpen}
        onToggle={setIsOpen}
        header={
          <FormattedMessage id="xpack.ml.explorer.alertsPanel.header" defaultMessage="Alerts" />
        }
      >
        {annotationXDomain && alertsData ? (
          <>
            <MlTooltipComponent>
              {(tooltipService) => (
                <AnnotationTimeline<AnomalyDetectionAlert>
                  key={'sdfsdfs'}
                  label={i18n.translate('xpack.ml.explorer.swimLaneAlertsLabel', {
                    defaultMessage: 'Alerts',
                  })}
                  chartWidth={swimlaneContainerWidth!}
                  domain={annotationXDomain}
                  data={alertsData}
                  tooltipService={tooltipService}
                  getTooltipContent={(item, hasMergedAnnotations) => {
                    const tooltipData: TooltipData = [];

                    let timespan = dateFormatter(item.timestamp);

                    if (typeof item.end_timestamp !== 'undefined') {
                      timespan += ` - ${dateFormatter(item.end_timestamp)}`;
                    }

                    if (hasMergedAnnotations) {
                      tooltipData.push(
                        {
                          label: item.ruleName,
                          value: `[${item.anomalyScore}]`,
                          formattedValue: `[${item.anomalyScore}]`,
                          seriesIdentifier: {
                            key: `${item.id}_name`,
                            specId: item.id,
                          },
                          isHighlighted: true,
                          isVisible: true,
                          color: item.color,
                        },
                        {
                          label: anomalyTimeLabel,
                          value: dateFormatter(item.anomalyTimestamp),
                          formattedValue: dateFormatter(item.anomalyTimestamp),
                          seriesIdentifier: {
                            key: `${item.id}_time`,
                            specId: item.id,
                          },
                          isHighlighted: true,
                          isVisible: true,
                          color: 'transparent',
                        },
                        {
                          label: durationLabel,
                          value: timespan,
                          formattedValue: timespan,
                          seriesIdentifier: {
                            key: `${item.id}_duration`,
                            specId: item.id,
                          },
                          isHighlighted: true,
                          isVisible: true,
                          color: 'transparent',
                        }
                      );
                    } else {
                      tooltipData.push(
                        {
                          label: item.ruleName,
                          value: `${item.anomalyScore}`,
                          formattedValue: `${item.anomalyScore}`,
                          seriesIdentifier: {
                            key: item.id,
                            specId: item.id,
                          },
                          isHighlighted: true,
                          isVisible: true,
                          color: 'transparent',
                        },
                        {
                          label: `Time`,
                          skipHeader: true,
                          value: `${timespan}`,
                          formattedValue: `${timespan}`,
                          seriesIdentifier: {
                            key: item.id,
                            specId: item.id,
                          },
                          valueAccessor: 'time',
                          isHighlighted: true,
                          isVisible: true,
                          color: 'transparent',
                        }
                      );
                    }
                    return tooltipData;
                  }}
                />
              )}
            </MlTooltipComponent>
            <EuiSpacer size="m" />
          </>
        ) : null}
      </CollapsiblePanel>
      <EuiSpacer size="m" />
    </>
  );
};
