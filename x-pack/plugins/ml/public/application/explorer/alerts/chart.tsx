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
import { Y_AXIS_LABEL_WIDTH } from '../swimlane_annotation_container';
import { useAnomalyExplorerContext } from '../anomaly_explorer_context';
import { useMlKibana } from '../../contexts/kibana';

export const AnomalyDetectionAlertsOverviewChart: FC = () => {
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
      type: 'lens',
      references: [
        {
          type: 'index-pattern',
          id: 'a552783c-3088-4835-bd82-5dd7def30c72',
          name: 'indexpattern-datasource-layer-cb8ce4c0-d0a7-4498-8212-20f6c32efddd',
        },
      ],
      state: {
        visualization: {
          legend: {
            isVisible: false,
          },
          valueLabels: 'hide',
          fittingFunction: 'None',
          axisTitlesVisibilitySettings: {
            x: true,
            yLeft: false,
            yRight: true,
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
          preferredSeriesType: 'line',
          layers: [
            {
              layerId: 'cb8ce4c0-d0a7-4498-8212-20f6c32efddd',
              accessors: ['7327df72-9def-4642-a72d-dc2b0790d5f9'],
              position: 'top',
              seriesType: 'line',
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
              'cb8ce4c0-d0a7-4498-8212-20f6c32efddd': {
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
                          compact: false,
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
        adHocDataViews: {},
      },
    } as TypedLensByValueInput['attributes'];
  }, [interval?.expression]);

  if (!interval) return null;

  return (
    <div
      css={css`
        padding-left: ${Y_AXIS_LABEL_WIDTH - 30}px;
        height: 150px;
        width: 100%;
      `}
    >
      <EmbeddableComponent
        id="mlExplorerAlertsPreview"
        style={{ height: 150 }}
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
