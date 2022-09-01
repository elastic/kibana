/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { Position, ScaleType } from '@elastic/charts';
import type { EuiSelectOption } from '@elastic/eui';
import type { Type, Language, ThreatMapping } from '@kbn/securitysolution-io-ts-alerting-types';
import type { Filter } from '@kbn/es-query';
import * as i18n from './translations';
import { histogramDateTimeFormatter } from '../../../../common/components/utils';
import type { ChartSeriesConfigs } from '../../../../common/components/charts/common';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import type { FieldValueQueryBar } from '../query_bar';
import type { ESQuery } from '../../../../../common/typed_json';
import type { TimeframePreviewOptions } from '../../../pages/detection_engine/rules/types';
import { DataSourceType } from '../../../pages/detection_engine/rules/types';

/**
 * Determines whether or not to display noise warning.
 * Is considered noisy if alerts/hour rate > 1
 * @param hits Total query search hits
 * @param timeframe Range selected by user (last hour, day...)
 */
export const isNoisy = (hits: number, timeframe: TimeframePreviewOptions): boolean => {
  const oneHour = 1000 * 60 * 60;
  const durationInHours = Math.max(
    (timeframe.timeframeEnd.valueOf() - timeframe.timeframeStart.valueOf()) / oneHour,
    1.0
  );
  return hits / durationInHours > 1;
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
      { value: 'h', text: i18n.LAST_HOUR },
      { value: 'd', text: i18n.LAST_DAY },
    ];
  } else if (ruleType === 'threat_match') {
    return [
      { value: 'h', text: i18n.LAST_HOUR },
      { value: 'd', text: i18n.LAST_DAY },
      { value: 'w', text: i18n.LAST_WEEK },
    ];
  } else if (ruleType === 'threshold') {
    return [{ value: 'h', text: i18n.LAST_HOUR }];
  } else {
    return [
      { value: 'h', text: i18n.LAST_HOUR },
      { value: 'd', text: i18n.LAST_DAY },
      { value: 'M', text: i18n.LAST_MONTH },
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

export const getIsRulePreviewDisabled = ({
  ruleType,
  isQueryBarValid,
  isThreatQueryBarValid,
  index,
  dataViewId,
  dataSourceType,
  threatIndex,
  threatMapping,
  machineLearningJobId,
  queryBar,
  newTermsFields,
}: {
  ruleType: Type;
  isQueryBarValid: boolean;
  isThreatQueryBarValid: boolean;
  index: string[];
  dataViewId: string | undefined;
  dataSourceType: DataSourceType;
  threatIndex: string[];
  threatMapping: ThreatMapping;
  machineLearningJobId: string[];
  queryBar: FieldValueQueryBar;
  newTermsFields: string[];
}) => {
  if (
    !isQueryBarValid ||
    (dataSourceType === DataSourceType.DataView && !dataViewId) ||
    (dataSourceType === DataSourceType.IndexPatterns && index.length === 0)
  ) {
    return true;
  }
  if (ruleType === 'threat_match') {
    if (!isThreatQueryBarValid || !threatIndex.length || !threatMapping) return true;
    if (
      !threatMapping.length ||
      !threatMapping[0].entries?.length ||
      !threatMapping[0].entries[0].field ||
      !threatMapping[0].entries[0].value
    )
      return true;
  }
  if (ruleType === 'machine_learning') {
    return machineLearningJobId.length === 0;
  }
  if (ruleType === 'eql' || ruleType === 'query' || ruleType === 'threshold') {
    return isEmpty(queryBar.query.query) && isEmpty(queryBar.filters);
  }
  if (ruleType === 'new_terms') {
    return newTermsFields.length === 0;
  }
  return false;
};
