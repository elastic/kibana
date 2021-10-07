/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isEmpty } from 'lodash';
import { TypedLensByValueInput } from '../../../../../../lens/public';
import { LayerConfig, LensAttributes } from '../configurations/lens_attributes';
import {
  AllSeries,
  allSeriesKey,
  convertAllShortSeries,
  useSeriesStorage,
} from './use_series_storage';
import { getDefaultConfigs } from '../configurations/default_configs';

import { ReportViewType, SeriesUrl, UrlFilter } from '../types';
import { IndexPatternState, useAppIndexPatternContext } from './use_app_index_pattern';
import { ALL_VALUES_SELECTED } from '../../field_value_suggestions/field_value_combobox';
import { useTheme } from '../../../../hooks/use_theme';
import { EuiTheme } from '../../../../../../../../src/plugins/kibana_react/common';
import { LABEL_FIELDS_BREAKDOWN } from '../configurations/constants';

export const getFiltersFromDefs = (reportDefinitions: SeriesUrl['reportDefinitions']) => {
  return Object.entries(reportDefinitions ?? {})
    .map(([field, value]) => {
      return {
        field,
        values: value,
      };
    })
    .filter(({ values }) => !values.includes(ALL_VALUES_SELECTED)) as UrlFilter[];
};

export function getLayerConfigs(
  allSeries: AllSeries,
  reportType: ReportViewType,
  theme: EuiTheme,
  indexPatterns: IndexPatternState
) {
  const layerConfigs: LayerConfig[] = [];

  allSeries.forEach((series, seriesIndex) => {
    const indexPattern = indexPatterns?.[series?.dataType];

    if (
      indexPattern &&
      !isEmpty(series.reportDefinitions) &&
      !series.hidden &&
      series.selectedMetricField
    ) {
      const seriesConfig = getDefaultConfigs({
        reportType,
        indexPattern,
        dataType: series.dataType,
      });

      const filters: UrlFilter[] = (series.filters ?? []).concat(
        getFiltersFromDefs(series.reportDefinitions)
      );

      const color = `euiColorVis${seriesIndex}`;

      layerConfigs.push({
        filters,
        indexPattern,
        seriesConfig,
        time: series.time,
        name: series.name,
        breakdown: series.breakdown === LABEL_FIELDS_BREAKDOWN ? undefined : series.breakdown,
        seriesType: series.seriesType,
        operationType: series.operationType,
        reportDefinitions: series.reportDefinitions ?? {},
        selectedMetricField: series.selectedMetricField,
        color: series.color ?? (theme.eui as unknown as Record<string, string>)[color],
      });
    }
  });

  return layerConfigs;
}

export const useLensAttributes = (): TypedLensByValueInput['attributes'] | null => {
  const { storage, allSeries, lastRefresh, reportType } = useSeriesStorage();

  const { indexPatterns } = useAppIndexPatternContext();

  const theme = useTheme();

  return useMemo(() => {
    if (isEmpty(indexPatterns) || isEmpty(allSeries) || !reportType) {
      return null;
    }

    const allSeriesT: AllSeries = convertAllShortSeries(storage.get(allSeriesKey) ?? []);

    const layerConfigs = getLayerConfigs(allSeriesT, reportType, theme, indexPatterns);

    if (layerConfigs.length < 1) {
      return null;
    }

    const lensAttributes = new LensAttributes(layerConfigs);

    return lensAttributes.getJSON(lastRefresh);
  }, [indexPatterns, allSeries, reportType, storage, theme, lastRefresh]);
};
