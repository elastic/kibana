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
import { useSeriesFilters } from '../hooks/use_series_filters';

interface Props {
  seriesId: string;
  series: DataSeries;
  isNew?: boolean;
}
export const SelectedFilters = ({ seriesId, isNew, series: { labels } }: Props) => {
  const { series } = useUrlStorage(seriesId);

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

  const { removeFilter } = useSeriesFilters({ seriesId });

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
                  removeFilter={() => removeFilter({ field, value: val, negate: false })}
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
                  removeFilter={() => removeFilter({ field, value: val, negate: true })}
                />
              </EuiFlexItem>
            ))}
          </Fragment>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  ) : null;
};
