/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  RiskScoreEntity,
  RiskScoreFields,
  RiskSeverity,
} from '../../../../../../../common/search_strategy';
import { RISK_SEVERITY_COLOUR } from '../../../../../../explore/components/risk_score/severity/common';
import type { LensAttributes } from '../../../types';

// TODO move it to constants
// TODO verify if it is inclusive or exclusive inside risk engine
const riskScoreRanges = {
  [RiskSeverity.unknown]: { start: 0, stop: 20 },
  [RiskSeverity.low]: { start: 20, stop: 40 },
  [RiskSeverity.moderate]: { start: 40, stop: 70 },
  [RiskSeverity.high]: { start: 70, stop: 90 },
  [RiskSeverity.critical]: { start: 90, stop: 100 },
};

const sortedRiskSeverities = [
  RiskSeverity.unknown,
  RiskSeverity.low,
  RiskSeverity.moderate,
  RiskSeverity.high,
  RiskSeverity.critical,
];

interface GetRiskScoreMetricAttributesProps {
  query?: string;
  spaceId?: string;
  severity?: RiskSeverity;
  riskEntity: RiskScoreEntity;
}

export const getRiskScoreMetricAttributes: (
  props: GetRiskScoreMetricAttributesProps
) => LensAttributes = ({ spaceId, query, severity, riskEntity }) => {
  const layerIds = [uuidv4(), uuidv4()];
  const internalReferenceId = uuidv4();
  const columnIds = [uuidv4(), uuidv4(), uuidv4()];
  const sourceField =
    riskEntity === RiskScoreEntity.user
      ? RiskScoreFields.userRiskScore
      : RiskScoreFields.hostRiskScore;

  return {
    title: 'risk score metric',
    description: '',
    visualizationType: 'lnsMetric',
    state: {
      visualization: {
        layerId: layerIds[0],
        layerType: 'data',
        metricAccessor: columnIds[0],
        maxAccessor: '9f24d615-df6f-4060-9dbd-0c8c848ad92f',
        showBar: false,
        progressDirection: 'horizontal',
        trendlineLayerId: layerIds[1],
        trendlineLayerType: 'metricTrendline',
        trendlineTimeAccessor: columnIds[1],
        trendlineMetricAccessor: columnIds[2],
        palette: {
          type: 'palette',
          name: 'status',
          params: {
            steps: 3,
            name: 'custom',
            reverse: false,
            rangeType: 'number',
            rangeMin: 0,
            rangeMax: null,
            progression: 'fixed',
            stops: sortedRiskSeverities.map((riskSeverity) => ({
              color: RISK_SEVERITY_COLOUR[riskSeverity],
              stop: riskScoreRanges[riskSeverity].stop,
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
                  operationType: 'last_value',
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
                  },
                  customLabel: true,
                },
                '9f24d615-df6f-4060-9dbd-0c8c848ad92f': {
                  label: 'Maximum risk value',
                  dataType: 'number',
                  operationType: 'static_value',
                  isStaticValue: true,
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    value: '100',
                  },
                  references: [],
                },
              },
              columnOrder: [columnIds[0], '9f24d615-df6f-4060-9dbd-0c8c848ad92f'],
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
