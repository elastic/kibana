/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect } from 'react';

import { useValues } from 'kea';

import { DataView } from '@kbn/data-views-plugin/common';

import { TimeRange } from '@kbn/es-query';
import {
  DateHistogramIndexPatternColumn,
  FormulaPublicApi,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';

import { LensByReferenceInput } from '@kbn/lens-plugin/public/embeddable';

import { AnalyticsCollection } from '../../../../../../common/types/analytics';

import { KibanaLogic } from '../../../../shared/kibana';

export enum FilterBy {
  Searches = 'Searches',
  NoResults = 'NoResults',
}

const getFilterFormulaByFilter = (filter: string, shift?: string | null): string => {
  const mapFilterByToFormula: { [key: string]: string } = {
    [FilterBy.Searches]: "count(kql='event.action: search'",
    [FilterBy.NoResults]: "count(kql='event.customer_data.totalResults : 0'",
  };
  const formula = mapFilterByToFormula[filter] || 'count(';

  return formula + (shift ? `, shift='${shift}'` : '') + ')';
};

const LENS_LAYERS = {
  metrics: {
    hitsTotal: 'hitsTotal',
    id: 'metrics',
    percentage: 'percentage',
  },
  trend: {
    id: 'trend',
    x: 'timeline',
    y: 'values',
  },
};
const getLensAttributes = (
  dataView: DataView,
  formulaApi: FormulaPublicApi,
  filterBy: string
): TypedLensByValueInput['attributes'] => {
  let metric = formulaApi.insertOrReplaceFormulaColumn(
    LENS_LAYERS.metrics.percentage,
    {
      formula: `round(((${getFilterFormulaByFilter(filterBy)}/${getFilterFormulaByFilter(
        filterBy,
        'previous'
      )})-1) * 100)`,
      label: ' ',
    },
    {
      columnOrder: [],
      columns: {},
    },
    dataView
  )!;
  metric = formulaApi.insertOrReplaceFormulaColumn(
    LENS_LAYERS.metrics.hitsTotal,
    { formula: getFilterFormulaByFilter(filterBy), label: ' ' },
    metric,
    dataView
  )!;

  return {
    references: [
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: dataView.id!,
        name: `indexpattern-datasource-layer-${LENS_LAYERS.trend.id}`,
        type: 'index-pattern',
      },
      {
        id: dataView.id!,
        name: `indexpattern-datasource-layer-${LENS_LAYERS.metrics.id}`,
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            [LENS_LAYERS.trend.id]: formulaApi.insertOrReplaceFormulaColumn(
              LENS_LAYERS.trend.y,
              {
                formula: getFilterFormulaByFilter(filterBy),
              },
              {
                columnOrder: [],
                columns: {
                  [LENS_LAYERS.trend.x]: {
                    dataType: 'date',
                    isBucketed: false,
                    label: 'Timestamp',
                    operationType: 'date_histogram',
                    params: { interval: 'auto' },
                    scale: 'ratio',
                    sourceField: dataView?.timeFieldName!,
                  } as DateHistogramIndexPatternColumn,
                },
              },
              dataView!
            )!,
            [LENS_LAYERS.metrics.id]: metric,
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        layerId: [LENS_LAYERS.metrics.id],
        layerType: 'data',
        metricAccessor: LENS_LAYERS.metrics.hitsTotal,
        secondaryMetricAccessor: LENS_LAYERS.metrics.percentage,
        trendlineLayerId: LENS_LAYERS.trend.id,
        trendlineMetricAccessor: LENS_LAYERS.trend.y,
        trendlineTimeAccessor: LENS_LAYERS.trend.x,
      },
    },
    title: '',
    visualizationType: 'lnsMetric',
  };
};

export interface WithLensDataInputProps {
  collection: AnalyticsCollection;
  filterBy: string;
  timeRange: TimeRange;
}

export interface WithLensDataLogicOutputProps {
  data: Array<[number, number]>;
  isLoading: boolean;
  metric: number | null;
  secondaryMetric: number | null;
}

const initialValues = {
  data: [],
  isLoading: true,
  metric: null,
  secondaryMetric: null,
};

export const withLensData = <T extends WithLensDataInputProps>(Component: React.FC<T>) => {
  const ComponentWithLensData = (props: Omit<T, keyof WithLensDataLogicOutputProps>) => {
    const {
      lens: { EmbeddableComponent, stateHelperApi },
      data: { dataViews },
    } = useValues(KibanaLogic);
    const [dataView, setDataView] = useState<DataView | null>(null);
    const [formula, setFormula] = useState<FormulaPublicApi | null>(null);
    const [lensData, setLensData] = useState<WithLensDataLogicOutputProps>(initialValues);
    const attributes = useMemo(
      () => dataView && formula && getLensAttributes(dataView, formula, props.filterBy),
      [props.filterBy, dataView, formula]
    );
    const onDataLoad: LensByReferenceInput['onLoad'] = (isLoading, adapters) => {
      if (isLoading) {
        setLensData(initialValues);
      } else if (adapters) {
        setLensData({
          data:
            (adapters.tables?.tables[LENS_LAYERS.trend.id]?.rows?.map((row) => [
              row[LENS_LAYERS.trend.x] as number,
              row[LENS_LAYERS.trend.y] as number,
            ]) as Array<[number, number]>) || [],
          isLoading: false,
          metric:
            adapters.tables?.tables[LENS_LAYERS.metrics.id]?.rows?.[0]?.[
              LENS_LAYERS.metrics.hitsTotal
            ] ?? null,
          secondaryMetric:
            adapters.tables?.tables[LENS_LAYERS.metrics.id]?.rows?.[0]?.[
              LENS_LAYERS.metrics.percentage
            ] ?? null,
        });
      }
    };

    useEffect(() => {
      dataViews.find(props.collection.events_datastream, 1).then(([targetDataView]) => {
        if (targetDataView) {
          setDataView(targetDataView);
        }
      });
    }, [props.collection.events_datastream]);
    useEffect(() => {
      stateHelperApi().then((helper) => {
        setFormula(helper.formula);
      });
    }, []);

    return (
      <Component {...(props as T)} {...lensData}>
        {dataView && attributes && (
          <div css={{ display: 'none' }}>
            <EmbeddableComponent
              id={props.collection.name}
              timeRange={props.timeRange}
              attributes={attributes}
              onLoad={onDataLoad}
            />
          </div>
        )}
      </Component>
    );
  };
  ComponentWithLensData.displayName = `withLensDataHOC(${Component.displayName || Component.name})`;

  return ComponentWithLensData;
};
