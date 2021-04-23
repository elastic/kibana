/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUrlStorage } from './use_url_storage';
import { UrlFilter } from '../types';

export interface UpdateFilter {
  field: string;
  value: string;
  negate?: boolean;
}

export const useSeriesFilters = ({ seriesId }: { seriesId: string }) => {
  const { series, setSeries } = useUrlStorage(seriesId);

  const filters = series.filters ?? [];

  const removeFilter = ({ field, value, negate }: UpdateFilter) => {
    const filtersN = filters
      .map((filter) => {
        if (filter.field === field) {
          if (negate) {
            const notValuesN = filter.notValues?.filter((val) => val !== value);
            return { ...filter, notValues: notValuesN };
          } else {
            const valuesN = filter.values?.filter((val) => val !== value);
            return { ...filter, values: valuesN };
          }
        }

        return filter;
      })
      .filter(({ values = [], notValues = [] }) => values.length > 0 || notValues.length > 0);
    setSeries(seriesId, { ...series, filters: filtersN });
  };

  const addFilter = ({ field, value, negate }: UpdateFilter) => {
    const currFilter: UrlFilter = { field };
    if (negate) {
      currFilter.notValues = [value];
    } else {
      currFilter.values = [value];
    }
    if (filters.length === 0) {
      setSeries(seriesId, { ...series, filters: [currFilter] });
    } else {
      setSeries(seriesId, {
        ...series,
        filters: [currFilter, ...filters.filter((ft) => ft.field !== field)],
      });
    }
  };

  const updateFilter = ({ field, value, negate }: UpdateFilter) => {
    const currFilter: UrlFilter | undefined = filters.find(({ field: fd }) => field === fd) ?? {
      field,
    };

    const currNotValues = currFilter.notValues ?? [];
    const currValues = currFilter.values ?? [];

    const notValues = currNotValues.filter((val) => val !== value);
    const values = currValues.filter((val) => val !== value);

    if (negate) {
      notValues.push(value);
    } else {
      values.push(value);
    }

    currFilter.notValues = notValues.length > 0 ? notValues : undefined;
    currFilter.values = values.length > 0 ? values : undefined;

    const otherFilters = filters.filter(({ field: fd }) => fd !== field);

    if (notValues.length > 0 || values.length > 0) {
      setSeries(seriesId, { ...series, filters: [...otherFilters, currFilter] });
    } else {
      setSeries(seriesId, { ...series, filters: otherFilters });
    }
  };

  const setFilter = ({ field, value, negate }: UpdateFilter) => {
    const currFilter: UrlFilter | undefined = filters.find(({ field: fd }) => field === fd);

    if (!currFilter) {
      addFilter({ field, value, negate });
    } else {
      updateFilter({ field, value, negate });
    }
  };

  const invertFilter = ({ field, value, negate }: UpdateFilter) => {
    updateFilter({ field, value, negate: !negate });
  };

  return { invertFilter, setFilter, removeFilter };
};
