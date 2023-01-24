/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type { GetLensAttributes } from '../../../types';

export const getRulePreviewLensAttributes: GetLensAttributes = (
  stackByField = 'event.category',
  extraOptions
) => {
  const layerId = uuidv4();
  const internalReferenceId = uuidv4();
  return {
    title: 'Rule preview',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        title: 'Empty XY chart',
        legend: {
          isVisible: false,
          position: 'left',
        },
        valueLabels: 'hide',
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId,
            accessors: ['9c89324b-0c59-4403-9698-d989a09dc5a8'],
            position: 'top',
            seriesType: 'bar_stacked',
            showGridlines: false,
            layerType: 'data',
            xAccessor: 'eba07b4d-766d-49d7-8435-d40367d3d055',
            splitAccessor: 'e92c8920-0449-4564-81f4-8945517817a4',
          },
        ],
        valuesInLegend: true,
        yTitle: '',
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: true,
        },
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [
        {
          meta: {
            disabled: false,
            negate: false,
            alias: null,
            index: internalReferenceId,
            key: 'kibana.alert.rule.uuid',
            field: 'kibana.alert.rule.uuid',
            params: {
              query: extraOptions?.ruleId,
            },
            type: 'phrase',
          },
          query: {
            match_phrase: {
              'kibana.alert.rule.uuid': extraOptions?.ruleId,
            },
          },
        },
      ],
      datasourceStates: {
        formBased: {
          layers: {
            [layerId]: {
              columns: {
                '9c89324b-0c59-4403-9698-d989a09dc5a8': {
                  label: 'Count of records',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  params: {
                    emptyAsNull: true,
                  },
                },
                'eba07b4d-766d-49d7-8435-d40367d3d055': {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: '@timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                    includeEmptyRows: true,
                    dropPartials: false,
                  },
                },
                'e92c8920-0449-4564-81f4-8945517817a4': {
                  label: `Top 10 values of ${stackByField}`,
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: stackByField,
                  isBucketed: true,
                  params: {
                    size: 10,
                    orderBy: {
                      type: 'column',
                      columnId: '9c89324b-0c59-4403-9698-d989a09dc5a8',
                    },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                    parentFormat: {
                      id: 'terms',
                    },
                    include: [],
                    exclude: [],
                    includeIsRegex: false,
                    excludeIsRegex: false,
                  },
                },
              },
              columnOrder: [
                'e92c8920-0449-4564-81f4-8945517817a4',
                'eba07b4d-766d-49d7-8435-d40367d3d055',
                '9c89324b-0c59-4403-9698-d989a09dc5a8',
              ],
              sampling: 1,
              incompleteColumns: {},
            },
          },
        },
        textBased: {
          layers: {},
        },
      },
      internalReferences: [
        {
          type: 'index-pattern',
          id: internalReferenceId,
          name: `indexpattern-datasource-layer-${layerId}`,
        },
      ],
      adHocDataViews: {
        [internalReferenceId]: {
          id: internalReferenceId,
          title: `.preview.alerts-security.alerts-${extraOptions?.spaceId}`,
          timeFieldName: '@timestamp',
          sourceFilters: [],
          fieldFormats: {},
          runtimeFieldMap: {},
          fieldAttrs: {},
          allowNoIndex: false,
          name: `.preview.alerts-security.alerts-${extraOptions?.spaceId}`,
        },
      },
    },
    references: [],
  };
};
