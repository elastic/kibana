/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Position, ScaleType } from '@elastic/charts';
import { EuiSelectOption } from '@elastic/eui';
import { Unit } from '@elastic/datemath';

import * as i18n from './translations';
import { histogramDateTimeFormatter } from '../../../../common/components/utils';
import { ChartSeriesConfigs } from '../../../../common/components/charts/common';
import { Type, Language } from '../../../../../common/detection_engine/schemas/common/schemas';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import { FieldValueQueryBar } from '../query_bar';
import { ESQuery } from '../../../../../common/typed_json';
import { Filter } from '../../../../../../../../src/plugins/data/common/es_query';

/**
 * Determines whether or not to display noise warning.
 * Is considered noisy if alerts/hour rate > 1
 * @param hits Total query search hits
 * @param timeframe Range selected by user (last hour, day...)
 */
export const isNoisy = (hits: number, timeframe: Unit): boolean => {
  if (timeframe === 'h') {
    return hits > 1;
  } else if (timeframe === 'd') {
    return hits / 24 > 1;
  } else if (timeframe === 'M') {
    return hits / 730 > 1;
  }

  return false;
};

/**
 * Determines what timerange options to show.
 * Eql sequence queries tend to be slower, so decided
 * not to include the last month option.
 * @param ruleType
 */
export const getTimeframeOptions = (ruleType: Type): EuiSelectOption[] => {
  if (ruleType === 'eql') {
    return [
      { value: 'h', text: 'Last hour' },
      { value: 'd', text: 'Last day' },
    ];
  } else {
    return [
      { value: 'h', text: 'Last hour' },
      { value: 'd', text: 'Last day' },
      { value: 'M', text: 'Last month' },
    ];
  }
};

/**
 * Quick little helper to extract the query info from the
 * queryBar object.
 * @param queryBar Object containing all query info
 * @param index Indices searched
 * @param ruleType
 */
export const getInfoFromQueryBar = (
  queryBar: FieldValueQueryBar,
  index: string[],
  ruleType: Type
): {
  queryString: string;
  language: Language;
  filters: Filter[];
  queryFilter: ESQuery | undefined;
} => {
  const queryString = typeof queryBar.query.query === 'string' ? queryBar.query.query : '';
  const language = queryBar.query.language as Language;
  const filters = queryBar.filters;

  // hm?? Why a try catch here? Because if the
  // query is invalid, it throws an error and
  // entire UI shows gross KQLSyntax error screen
  try {
    const queryFilter =
      ruleType !== 'eql'
        ? getQueryFilter(queryString, language, filters, index, [], true)
        : undefined;

    return {
      queryString,
      language,
      filters,
      queryFilter,
    };
  } catch {
    return {
      queryString,
      language,
      filters,
      queryFilter: undefined,
    };
  }
};

/**
 * Config passed into elastic-charts settings.
 * @param to
 * @param from
 */
export const getHistogramConfig = (
  to: string,
  from: string,
  showLegend = false
): ChartSeriesConfigs => {
  return {
    series: {
      xScaleType: ScaleType.Time,
      yScaleType: ScaleType.Linear,
      stackAccessors: ['g'],
    },
    axis: {
      xTickFormatter: histogramDateTimeFormatter([to, from]),
      yTickFormatter: (value: string | number): string => value.toLocaleString(),
      tickSize: 8,
    },
    yAxisTitle: i18n.QUERY_GRAPH_COUNT,
    settings: {
      legendPosition: Position.Right,
      showLegend,
      showLegendExtra: showLegend,
      theme: {
        scales: {
          barsPadding: 0.08,
        },
        chartMargins: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
        chartPaddings: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },
    },
    customHeight: 200,
  };
};

/**
 * Threshold histogram is displayed a bit differently,
 * x-axis is not time based, but ordinal.
 */
export const getThresholdHistogramConfig = (): ChartSeriesConfigs => {
  return {
    series: {
      xScaleType: ScaleType.Ordinal,
      yScaleType: ScaleType.Linear,
      stackAccessors: ['g'],
    },
    axis: {
      yTickFormatter: (value: string | number): string => value.toLocaleString(),
      tickSize: 8,
    },
    yAxisTitle: i18n.QUERY_GRAPH_COUNT,
    settings: {
      legendPosition: Position.Right,
      showLegend: true,
      showLegendExtra: true,
      theme: {
        scales: {
          barsPadding: 0.08,
        },
        chartMargins: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
        chartPaddings: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },
    },
    customHeight: 200,
  };
};
