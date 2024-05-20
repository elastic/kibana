/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo } from 'react';
import { useTimeRangeUpdates } from '@kbn/ml-date-picker';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useAnomalyExplorerContext } from '../anomaly_explorer_context';
import { useMlKibana } from '../../contexts/kibana';
import { Y_AXIS_LABEL_WIDTH } from '../constants';

export interface AnomalyDetectionAlertsOverviewChart {
  seriesType?: 'bar_stacked' | 'line';
}

export const AnomalyDetectionAlertsOverviewChart: FC<AnomalyDetectionAlertsOverviewChart> = ({
  seriesType = 'line',
}) => {
  const {
    services: {
      lens: { EmbeddableComponent },
    },
  } = useMlKibana();

  const { anomalyTimelineStateService } = useAnomalyExplorerContext();

  const timeRange = useTimeRangeUpdates();

  const interval = useObservable(
    anomalyTimelineStateService.getSwimLaneBucketInterval$(),
    anomalyTimelineStateService.getSwimLaneBucketInterval()
  );

  const attributes = useMemo<TypedLensByValueInput['attributes']>(() => {
    return {
      title: '',
      visualizationType: 'lnsXY',
      references: [],
      type: 'lens',
      state: {
        internalReferences: [
          {
            type: 'index-pattern',
            id: 'ml-alerts-data-view',
            name: 'indexpattern-datasource-layer-layer1',
          },
        ],
        adHocDataViews: {
          'ml-alerts-data-view': {
            id: 'ml-alerts-data-view',
            title: '.alerts-ml.anomaly-detection.alerts-default',
            timeFieldName: '@timestamp',
          },
        },
        visualization: {
          hideEndzones: true,
          legend: {
            isVisible: false,
          },
          valueLabels: 'hide',
          fittingFunction: 'None',
          axisTitlesVisibilitySettings: {
            x: false,
            yLeft: false,
            yRight: false,
          },
          tickLabelsVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          labelsOrientation: {
            x: 0,
            yLeft: 0,
            yRight: 0,
          },
          gridlinesVisibilitySettings: {
            x: true,
            yLeft: true,
            yRight: true,
          },
          preferredSeriesType: seriesType,
          layers: [
            {
              layerId: 'layer1',
              accessors: ['7327df72-9def-4642-a72d-dc2b0790d5f9'],
              position: 'top',
              seriesType,
              showGridlines: false,
              layerType: 'data',
              xAccessor: '953f9efc-fbf6-44e0-a450-c645d2b5ec22',
            },
          ],
        },
        query: {
          query: '',
          language: 'kuery',
        },
        filters: [],
        datasourceStates: {
          formBased: {
            layers: {
              layer1: {
                columns: {
                  '953f9efc-fbf6-44e0-a450-c645d2b5ec22': {
                    label: '@timestamp',
                    dataType: 'date',
                    operationType: 'date_histogram',
                    sourceField: '@timestamp',
                    isBucketed: true,
                    scale: 'interval',
                    params: {
                      interval: interval?.expression,
                      includeEmptyRows: true,
                      dropPartials: false,
                    },
                  },
                  '7327df72-9def-4642-a72d-dc2b0790d5f9': {
                    label: i18n.translate('xpack.ml.explorer.alerts.totalAlerts', {
                      defaultMessage: 'Total alerts',
                    }),
                    dataType: 'number',
                    operationType: 'count',
                    isBucketed: false,
                    scale: 'ratio',
                    sourceField: '___records___',
                    params: {
                      emptyAsNull: false,
                      format: {
                        id: 'number',
                        params: {
                          decimals: 0,
                          compact: true,
                        },
                      },
                    },
                  },
                },
                columnOrder: [
                  '953f9efc-fbf6-44e0-a450-c645d2b5ec22',
                  '7327df72-9def-4642-a72d-dc2b0790d5f9',
                ],
                incompleteColumns: {},
                sampling: 1,
              },
            },
          },
          indexpattern: {
            layers: {},
          },
          textBased: {
            layers: {},
          },
        },
      },
    } as TypedLensByValueInput['attributes'];
  }, [interval?.expression, seriesType]);

  if (!interval) return null;

  return (
    <div
      css={css`
        padding-left: ${Y_AXIS_LABEL_WIDTH - 45}px;
        height: 120px;
        width: 100%;
      `}
    >
      <EmbeddableComponent
        id="mlExplorerAlertsPreview"
        style={{ height: 120 }}
        timeRange={timeRange}
        attributes={attributes}
        renderMode={'view'}
        executionContext={{
          type: 'ml_overall_alert_preview_chart',
          name: 'Anomaly detection alert preview chart',
        }}
        disableTriggers
      />
    </div>
  );
};
