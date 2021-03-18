/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo } from 'react';
import { NEW_SERIES_KEY, useUrlStorage } from '../hooks/use_url_strorage';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FilterLabel } from '../components/filter_label';
import { DataSeries, UrlFilter } from '../types';
import { useIndexPatternContext } from '../../../../hooks/use_default_index_pattern';

interface Props {
  seriesId: string;
  series: DataSeries;
  isNew?: boolean;
}
export const SelectedFilters = ({ seriesId, isNew, series: { labels } }: Props) => {
  const { series, setSeries } = useUrlStorage(seriesId);

  const { reportDefinitions = {} } = series;
  const getFiltersFromDefs = () => {
    return Object.entries(reportDefinitions).map(([field, value]) => ({
      field,
      values: [value],
    })) as UrlFilter[];
  };

  const filters: UrlFilter[] = useMemo(() => {
    if (seriesId === NEW_SERIES_KEY && isNew) {
      return series.filters ?? [];
    }
    return (series.filters ?? []).concat(getFiltersFromDefs());
  }, [series.filters, reportDefinitions]);

  const removeFilter = (field: string, value: string, notVal: boolean) => {
    const filtersN = filters.map((filter) => {
      if (filter.field === field) {
        if (notVal) {
          const notValuesN = filter.notValues?.filter((val) => val !== value);
          return { ...filter, notValues: notValuesN };
        } else {
          const valuesN = filter.values?.filter((val) => val !== value);
          return { ...filter, values: valuesN };
        }
      }

      return filter;
    });
    setSeries(seriesId, { ...series, filters: filtersN });
  };

  const { indexPattern } = useIndexPatternContext();

  return filters.length > 0 && indexPattern ? (
    <EuiFlexItem>
      <EuiFlexGroup wrap gutterSize="xs">
        {filters.map(({ field, values, notValues }) => (
          <Fragment key={field}>
            {(values ?? []).map((val) => (
              <EuiFlexItem key={field + val} grow={false}>
                <FilterLabel
                  seriesId={seriesId}
                  field={field}
                  label={labels[field]}
                  value={val}
                  removeFilter={() => removeFilter(field, val, false)}
                  negate={false}
                />
              </EuiFlexItem>
            ))}
            {(notValues ?? []).map((val) => (
              <EuiFlexItem key={field + val} grow={false}>
                <FilterLabel
                  seriesId={seriesId}
                  field={field}
                  label={labels[field]}
                  value={val}
                  negate={true}
                  removeFilter={() => removeFilter(field, val, true)}
                />
              </EuiFlexItem>
            ))}
          </Fragment>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  ) : null;
};
