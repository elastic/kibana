/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useUrlStorage } from '../hooks/use_url_storage';
import { FilterLabel } from '../components/filter_label';
import { DataSeries, UrlFilter } from '../types';
import { useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { useSeriesFilters } from '../hooks/use_series_filters';
import { getFiltersFromDefs } from '../hooks/use_lens_attributes';

interface Props {
  seriesId: string;
  series: DataSeries;
  isNew?: boolean;
}
export function SelectedFilters({ seriesId, isNew, series: dataSeries }: Props) {
  const { series } = useUrlStorage(seriesId);

  const { reportDefinitions = {} } = series;

  const { labels } = dataSeries;

  const filters: UrlFilter[] = series.filters ?? [];

  let definitionFilters: UrlFilter[] = getFiltersFromDefs(reportDefinitions, dataSeries);

  // we don't want to display report definition filters in new series view
  if (isNew) {
    definitionFilters = [];
  }

  const { removeFilter } = useSeriesFilters({ seriesId });

  const { indexPattern } = useAppIndexPatternContext();

  return (filters.length > 0 || definitionFilters.length > 0) && indexPattern ? (
    <EuiFlexItem>
      <EuiFlexGroup wrap gutterSize="xs">
        {filters.map(({ field, values, notValues }) => (
          <Fragment key={field}>
            {(values ?? []).map((val) => (
              <EuiFlexItem key={field + val} grow={false} style={{ maxWidth: 300 }}>
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
              <EuiFlexItem key={field + val} grow={false} style={{ maxWidth: 300 }}>
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

        {definitionFilters.map(({ field, values }) => (
          <Fragment key={field}>
            {(values ?? []).map((val) => (
              <EuiFlexItem key={field + val} grow={false}>
                <FilterLabel
                  seriesId={seriesId}
                  field={field}
                  label={labels[field]}
                  value={val}
                  removeFilter={() => {
                    // FIXME handle this use case
                  }}
                  negate={false}
                  definitionFilter={true}
                />
              </EuiFlexItem>
            ))}
          </Fragment>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  ) : null;
}
