/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUrlStorage } from './use_url_strorage';
import { FILTERS } from '../configurations/constants';
import { UrlFilter } from '../types';

interface Props {
  seriesId: string;
}
export const useSeriesFilters = ({ seriesId }: Props) => {
  const { series, setSeries } = useUrlStorage(seriesId);

  const filters = series[FILTERS] ?? [];

  const invertFilter = (field: string, value: string, negate: boolean) => {
    let currFilter: UrlFilter | undefined = filters.find(({ field: fd }) => field === fd)!;

    const currNotValues = currFilter.notValues ?? [];
    const currValues = currFilter.values ?? [];

    const notValues = currNotValues.filter((val) => val !== value);
    const values = currValues.filter((val) => val !== value);

    if (negate) {
      values.push(value);
    } else {
      notValues.push(value);
    }

    currFilter.notValues = notValues.length > 0 ? notValues : undefined;
    currFilter.values = values.length > 0 ? values : undefined;

    if (notValues.length > 0 || values.length > 0) {
      setSeries(seriesId, { ...series, [FILTERS]: [currFilter] });
    } else {
      setSeries(seriesId, { ...series, [FILTERS]: undefined });
    }
  };

  return { invertFilter };
};
