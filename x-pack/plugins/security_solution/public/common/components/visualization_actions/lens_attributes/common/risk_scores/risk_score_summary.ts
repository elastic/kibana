/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SEVERITY_UI_SORT_ORDER,
  RISK_SEVERITY_COLOUR,
  RISK_SCORE_RANGES,
} from '../../../../../../entity_analytics/common/utils';
import type { RiskSeverity } from '../../../../../../../common/search_strategy';
import { RiskScoreEntity, RiskScoreFields } from '../../../../../../../common/search_strategy';
import type { LensAttributes } from '../../../types';

interface GetRiskScoreSummaryAttributesProps {
  query?: string;
  spaceId?: string;
  severity?: RiskSeverity;
  riskEntity: RiskScoreEntity;
}

export const getRiskScoreSummaryAttributes: (
  props: GetRiskScoreSummaryAttributesProps
) => LensAttributes = ({ spaceId, query, severity, riskEntity }) => {
  const layerIds = [uuidv4(), uuidv4()];
  const internalReferenceId = uuidv4();
  const columnIds = [uuidv4(), uuidv4(), uuidv4()];
  const sourceField =
    riskEntity === RiskScoreEntity.user
      ? RiskScoreFields.userRiskScore
      : RiskScoreFields.hostRiskScore;

  return {
    title: 'Risk score summary',
    description: '',
    visualizationType: 'lnsMetric',
    state: {
      visualization: {
        layerId: layerIds[0],
        layerType: 'data',
        metricAccessor: columnIds[0],
        trendlineLayerId: layerIds[1],
        trendlineLayerType: 'metricTrendline',
        trendlineTimeAccessor: columnIds[1],
        trendlineMetricAccessor: columnIds[2],
        palette: {
          type: 'palette',
          name: 'custom',
          params: {
            steps: 3,
            name: 'custom',
            reverse: false,
            rangeType: 'number',
            rangeMin: 0,
            rangeMax: null,
            progression: 'fixed',
            colorStops: SEVERITY_UI_SORT_ORDER.map((riskSeverity) => ({
              color: RISK_SEVERITY_COLOUR[riskSeverity],
              stop: RISK_SCORE_RANGES[riskSeverity].start,
            })),
            stops: SEVERITY_UI_SORT_ORDER.map((riskSeverity) => ({
              color: RISK_SEVERITY_COLOUR[riskSeverity],
              stop: RISK_SCORE_RANGES[riskSeverity].stop,
            })),
            continuity: 'above',
            maxSteps: 5,
          },
        },
        subtitle: severity,
      },
      query: {
        query: query ?? '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        formBased: {
          layers: {
            [layerIds[0]]: {
              columns: {
                [columnIds[0]]: {
                  label: 'Risk',
                  dataType: 'number',
                  operationType: 'max',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField,
                  reducedTimeRange: '',
                  params: {
                    sortField: '@timestamp',
                    format: {
                      id: 'number',
                      params: {
                        decimals: 0,
                        compact: false,
                      },
                    },
                    emptyAsNull: true,
                  },
                  customLabel: true,
                },
              },
              columnOrder: [columnIds[0]],
              incompleteColumns: {},
            },
            [layerIds[1]]: {
              linkToLayers: [layerIds[0]],
              columns: {
                [columnIds[1]]: {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: RiskScoreFields.timestamp,
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                    includeEmptyRows: true,
                    dropPartials: false,
                  },
                },
                [columnIds[2]]: {
                  label: 'Risk value',
                  dataType: 'number',
                  operationType: 'last_value',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField,
                  filter: {
                    query: '',
                    language: 'kuery',
                  },
                  timeShift: '',
                  reducedTimeRange: '',
                  params: {
                    sortField: '@timestamp',
                    format: {
                      id: 'number',
                      params: {
                        decimals: 0,
                        compact: false,
                      },
                    },
                  },
                  customLabel: true,
                },
              },
              columnOrder: [columnIds[1], columnIds[2]],
              sampling: 1,
              ignoreGlobalFilters: false,
              incompleteColumns: {},
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
      internalReferences: [
        {
          type: 'index-pattern',
          id: internalReferenceId,
          name: `indexpattern-datasource-layer-${layerIds[0]}`,
        },
        {
          type: 'index-pattern',
          id: internalReferenceId,
          name: `indexpattern-datasource-layer-${layerIds[1]}`,
        },
      ],
      adHocDataViews: {
        [internalReferenceId]: {
          id: internalReferenceId,
          title: `risk-score.risk-score-${spaceId ?? 'default'}`,
          timeFieldName: '@timestamp',
          sourceFilters: [],
          fieldFormats: {},
          runtimeFieldMap: {},
          fieldAttrs: {},
          allowNoIndex: false,
          name: `risk-score.risk-score-${spaceId ?? 'default'}`,
        },
      },
    },
    references: [],
  };
};
