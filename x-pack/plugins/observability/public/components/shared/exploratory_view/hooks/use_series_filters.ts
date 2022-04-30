/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concat } from 'lodash';
import { useSeriesStorage } from './use_series_storage';
import { SeriesUrl, UrlFilter } from '../types';

export interface UpdateFilter {
  field: string;
  value: string | string[];
  negate?: boolean;
  wildcards?: string[];
  isWildcard?: boolean;
}

export const useSeriesFilters = ({ seriesId, series }: { seriesId: number; series: SeriesUrl }) => {
  const { setSeries } = useSeriesStorage();

  const filters = series.filters ?? [];

  const replaceFilter = ({
    field,
    values,
    notValues,
    wildcards,
    notWildcards,
  }: {
    field: string;
    values: string[];
    notValues: string[];
    wildcards?: string[];
    notWildcards?: string[];
  }) => {
    const currFilter: UrlFilter | undefined = filters.find(({ field: fd }) => field === fd) ?? {
      field,
    };

    currFilter.notValues = notValues.length > 0 ? notValues : undefined;
    currFilter.values = values.length > 0 ? values : undefined;

    currFilter.wildcards = wildcards;
    currFilter.notWildcards = notWildcards;

    const otherFilters = filters.filter(({ field: fd }) => fd !== field);

    if (concat(values, notValues, wildcards, notWildcards).length > 0) {
      setSeries(seriesId, { ...series, filters: [...otherFilters, currFilter] });
    } else {
      setSeries(seriesId, { ...series, filters: otherFilters });
    }
  };

  const removeFilter = ({ field, value, negate, isWildcard }: UpdateFilter) => {
    const filtersN = filters
      .map((filter) => {
        if (filter.field === field) {
          if (negate) {
            if (isWildcard) {
              const notWildcardsN = filter.notWildcards?.filter((val) =>
                value instanceof Array ? !value.includes(val) : val !== value
              );
              return { ...filter, notWildcards: notWildcardsN };
            }
            const notValuesN = filter.notValues?.filter((val) =>
              value instanceof Array ? !value.includes(val) : val !== value
            );
            return { ...filter, notValues: notValuesN };
          } else {
            if (isWildcard) {
              const wildcardsN = filter.wildcards?.filter((val) =>
                value instanceof Array ? !value.includes(val) : val !== value
              );
              return { ...filter, wildcards: wildcardsN };
            }
            const valuesN = filter.values?.filter((val) =>
              value instanceof Array ? !value.includes(val) : val !== value
            );
            return { ...filter, values: valuesN };
          }
        }

        return filter;
      })
      .filter(
        ({ values = [], notValues = [], wildcards = [], notWildcards = [] }) =>
          values.length > 0 ||
          notValues.length > 0 ||
          wildcards.length > 0 ||
          notWildcards.length > 0
      );
    setSeries(seriesId, { ...series, filters: filtersN });
  };

  const addFilter = ({ field, value, negate }: UpdateFilter) => {
    const currFilter: UrlFilter = { field };
    if (negate) {
      currFilter.notValues = value instanceof Array ? value : [value];
    } else {
      currFilter.values = value instanceof Array ? value : [value];
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

  const updateFilter = ({ field, value, negate, wildcards }: UpdateFilter) => {
    const currFilter: UrlFilter | undefined = filters.find(({ field: fd }) => field === fd) ?? {
      field,
    };

    const currNotValues = currFilter.notValues ?? [];
    const currValues = currFilter.values ?? [];

    const notValues = currNotValues.filter((val) =>
      value instanceof Array ? !value.includes(val) : val !== value
    );

    const values = currValues.filter((val) =>
      value instanceof Array ? !value.includes(val) : val !== value
    );

    if (negate) {
      if (value instanceof Array) {
        notValues.push(...value);
      } else {
        notValues.push(value);
      }
    } else {
      if (value instanceof Array) {
        values.push(...value);
      } else {
        values.push(value);
      }
    }

    replaceFilter({ field, values, notValues, wildcards });
  };

  const setFilter = ({ field, value, negate, wildcards }: UpdateFilter) => {
    const currFilter: UrlFilter | undefined = filters.find(({ field: fd }) => field === fd);

    if (!currFilter) {
      addFilter({ field, value, negate, wildcards });
    } else {
      updateFilter({ field, value, negate, wildcards });
    }
  };

  const setFiltersWildcard = ({ field, wildcards }: { field: string; wildcards: string[] }) => {
    let currFilter: UrlFilter | undefined = filters.find(({ field: fd }) => field === fd);

    if (!currFilter) {
      currFilter = { field, wildcards };

      if (filters.length === 0) {
        setSeries(seriesId, { ...series, filters: [currFilter] });
      } else {
        setSeries(seriesId, {
          ...series,
          filters: [currFilter, ...filters.filter((ft) => ft.field !== field)],
        });
      }
    } else {
      replaceFilter({
        field,
        values: currFilter.values ?? [],
        notValues: currFilter.notValues ?? [],
        wildcards,
      });
    }
  };

  const invertFilter = ({ field, value, negate }: UpdateFilter) => {
    updateFilter({ field, value, negate: !negate });
  };

  return { invertFilter, setFilter, removeFilter, replaceFilter, setFiltersWildcard };
};
