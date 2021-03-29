/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { TypedLensByValueInput } from '../../../../../../lens/public';
import { LensAttributes } from '../configurations/lens_attributes';
import { useUrlStorage } from './use_url_strorage';
import { getDefaultConfigs } from '../configurations/default_configs';

import { IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { DataSeries, SeriesUrl, UrlFilter } from '../types';

interface Props {
  seriesId: string;
  indexPattern?: IndexPattern | null;
}

export const getFiltersFromDefs = (
  reportDefinitions: SeriesUrl['reportDefinitions'],
  dataViewConfig: DataSeries
) => {
  const rdfFilters = Object.entries(reportDefinitions ?? {}).map(([field, value]) => {
    return {
      field,
      values: [value],
    };
  }) as UrlFilter[];

  // let's filter out custom fields
  return rdfFilters.filter(({ field }) => {
    const rdf = dataViewConfig.reportDefinitions.find(({ field: fd }) => field === fd);
    return !rdf?.custom;
  });
};

export const useLensAttributes = ({
  seriesId,
  indexPattern,
}: Props): TypedLensByValueInput['attributes'] | null => {
  const { series } = useUrlStorage(seriesId);

  const { breakdown, seriesType, metric: metricType, reportType, reportDefinitions = {} } =
    series ?? {};

  return useMemo(() => {
    if (!indexPattern || !reportType) {
      return null;
    }

    const dataViewConfig = getDefaultConfigs({
      seriesId,
      reportType,
      indexPattern,
    });

    const filters: UrlFilter[] = (series.filters ?? []).concat(
      getFiltersFromDefs(reportDefinitions, dataViewConfig)
    );

    const lensAttributes = new LensAttributes(
      indexPattern,
      dataViewConfig,
      seriesType,
      filters,
      metricType,
      reportDefinitions
    );

    if (breakdown) {
      lensAttributes.addBreakdown(breakdown);
    }

    return lensAttributes.getJSON();
  }, [
    indexPattern,
    breakdown,
    seriesType,
    metricType,
    reportType,
    reportDefinitions,
    seriesId,
    series.filters,
  ]);
};
