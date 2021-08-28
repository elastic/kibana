/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash';
import { useMemo } from 'react';
import type { TypedLensByValueInput } from '../../../../../../lens/public/embeddable/embeddable_component';
import { ALL_VALUES_SELECTED } from '../../field_value_suggestions/field_value_combobox';
import { getDefaultConfigs } from '../configurations/default_configs';
import type { LayerConfig } from '../configurations/lens_attributes';
import { LensAttributes } from '../configurations/lens_attributes';
import type { SeriesUrl, UrlFilter } from '../types';
import { useAppIndexPatternContext } from './use_app_index_pattern';
import { useSeriesStorage } from './use_series_storage';

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
  const { allSeriesIds, allSeries } = useSeriesStorage();

  const { indexPatterns } = useAppIndexPatternContext();

  return useMemo(() => {
    if (isEmpty(indexPatterns) || isEmpty(allSeriesIds)) {
      return null;
    }

    const layerConfigs: LayerConfig[] = [];

    allSeriesIds.forEach((seriesIdT) => {
      const seriesT = allSeries[seriesIdT];
      const indexPattern = indexPatterns?.[seriesT?.dataType];
      if (indexPattern && seriesT.reportType && !isEmpty(seriesT.reportDefinitions)) {
        const seriesConfig = getDefaultConfigs({
          reportType: seriesT.reportType,
          dataType: seriesT.dataType,
          indexPattern,
        });

        const filters: UrlFilter[] = (seriesT.filters ?? []).concat(
          getFiltersFromDefs(seriesT.reportDefinitions)
        );

        layerConfigs.push({
          filters,
          indexPattern,
          seriesConfig,
          time: seriesT.time,
          breakdown: seriesT.breakdown,
          seriesType: seriesT.seriesType,
          operationType: seriesT.operationType,
          reportDefinitions: seriesT.reportDefinitions ?? {},
          selectedMetricField: seriesT.selectedMetricField,
        });
      }
    });

    if (layerConfigs.length < 1) {
      return null;
    }

    const lensAttributes = new LensAttributes(layerConfigs);

    return lensAttributes.getJSON();
  }, [indexPatterns, allSeriesIds, allSeries]);
};
