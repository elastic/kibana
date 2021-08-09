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

import { SeriesUrl, UrlFilter } from '../types';
import { useAppIndexPatternContext } from './use_app_index_pattern';
import { ALL_VALUES_SELECTED } from '../../field_value_suggestions/field_value_combobox';
import { useTheme } from '../../../../hooks/use_theme';

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

export const useLensAttributes = (): TypedLensByValueInput['attributes'] | null => {
  const { storage, autoApply, allSeries, lastRefresh, reportType } = useSeriesStorage();

  const { indexPatterns } = useAppIndexPatternContext();

  const theme = useTheme();

  return useMemo(() => {
    if (isEmpty(indexPatterns) || isEmpty(allSeries) || !reportType) {
      return null;
    }

    const allSeriesT: AllSeries = autoApply
      ? allSeries
      : convertAllShortSeries(storage.get(allSeriesKey) ?? []);

    const layerConfigs: LayerConfig[] = [];

    allSeriesT.forEach((series, seriesIndex) => {
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
          breakdown: series.breakdown,
          seriesType: series.seriesType,
          operationType: series.operationType,
          reportDefinitions: series.reportDefinitions ?? {},
          selectedMetricField: series.selectedMetricField,
          color: series.color ?? ((theme.eui as unknown) as Record<string, string>)[color],
        });
      }
    });

    if (layerConfigs.length < 1) {
      return null;
    }

    const lensAttributes = new LensAttributes(layerConfigs);

    return lensAttributes.getJSON(lastRefresh);
  }, [indexPatterns, allSeries, reportType, autoApply, storage, theme, lastRefresh]);
};
