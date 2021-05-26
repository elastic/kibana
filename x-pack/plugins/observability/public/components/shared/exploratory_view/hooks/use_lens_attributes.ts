/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isEmpty } from 'lodash';
import { TypedLensByValueInput } from '../../../../../../lens/public';
import { LensAttributes } from '../configurations/lens_attributes';
import { useUrlStorage } from './use_url_storage';
import { getDefaultConfigs } from '../configurations/default_configs';

import { DataSeries, SeriesUrl, UrlFilter } from '../types';
import { useAppIndexPatternContext } from './use_app_index_pattern';

interface Props {
  seriesId: string;
}

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

export const useLensAttributes = ({
  seriesId,
}: Props): TypedLensByValueInput['attributes'] | null => {
  const { series } = useUrlStorage(seriesId);

  const { breakdown, seriesType, operationType, reportType, reportDefinitions = {} } = series ?? {};

  const { indexPattern } = useAppIndexPatternContext();

  return useMemo(() => {
    if (!indexPattern || !reportType || isEmpty(reportDefinitions)) {
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
      operationType,
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
    operationType,
    reportType,
    reportDefinitions,
    seriesId,
    series.filters,
  ]);
};
