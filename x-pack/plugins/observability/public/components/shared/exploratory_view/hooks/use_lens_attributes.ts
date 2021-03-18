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

import { IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { UrlFilter } from '../types';

interface Props {
  seriesId: string;
  indexPattern?: IIndexPattern | null;
}

export const useLensAttributes = ({
  seriesId,
  indexPattern,
}: Props): TypedLensByValueInput['attributes'] | null => {
  const { series } = useUrlStorage(seriesId);

  const { breakdown, seriesType, metric: metricType, reportType, reportDefinitions = {} } =
    series ?? {};

  const getFiltersFromDefs = () => {
    return Object.entries(reportDefinitions).map(([field, value]) => ({
      field,
      values: [value],
    })) as UrlFilter[];
  };

  const filters: UrlFilter[] = useMemo(() => {
    return (series.filters ?? []).concat(getFiltersFromDefs());
  }, [series.filters, reportDefinitions]);

  const dataViewConfig = getDefaultConfigs({
    seriesId,
    reportType,
  });

  return useMemo(() => {
    if (!indexPattern || !reportType) {
      return null;
    }

    const lensAttributes = new LensAttributes(
      indexPattern,
      dataViewConfig,
      seriesType!,
      filters,
      metricType
    );

    if (breakdown) {
      lensAttributes.addBreakdown(breakdown);
    }

    return lensAttributes.getJSON();
  }, [indexPattern, breakdown, seriesType, filters, metricType, reportType]);
};
