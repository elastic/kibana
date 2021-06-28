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
import { useSeriesStorage } from './use_series_storage';
import { getDefaultConfigs } from '../configurations/default_configs';

import { DataSeries, SeriesUrl, UrlFilter } from '../types';
import { useAppIndexPatternContext } from './use_app_index_pattern';

export const getFiltersFromDefs = (
  reportDefinitions: SeriesUrl['reportDefinitions'],
  dataViewConfig: DataSeries
) => {
  const rdfFilters = Object.entries(reportDefinitions ?? {}).map(([field, value]) => {
    return {
      field,
      values: value,
    };
  }) as UrlFilter[];

  // let's filter out custom fields
  return rdfFilters.filter(({ field }) => {
    const rdf = dataViewConfig.reportDefinitions.find(({ field: fd }) => field === fd);
    return !rdf?.custom;
  });
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
        const reportViewConfig = getDefaultConfigs({
          reportType: seriesT.reportType,
          dataType: seriesT.dataType,
          indexPattern,
        });

        const filters: UrlFilter[] = (seriesT.filters ?? []).concat(
          getFiltersFromDefs(seriesT.reportDefinitions, reportViewConfig)
        );

        layerConfigs.push({
          filters,
          indexPattern,
          reportConfig: reportViewConfig,
          breakdown: seriesT.breakdown,
          operationType: seriesT.operationType,
          seriesType: seriesT.seriesType,
          reportDefinitions: seriesT.reportDefinitions ?? {},
          time: seriesT.time,
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
