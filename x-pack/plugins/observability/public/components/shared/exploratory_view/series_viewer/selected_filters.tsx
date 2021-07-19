/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';
import { FilterLabel } from '../components/filter_label';
import { SeriesConfig, SeriesUrl, UrlFilter } from '../types';
import { useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { useSeriesFilters } from '../hooks/use_series_filters';
import { getFiltersFromDefs } from '../hooks/use_lens_attributes';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  seriesConfig: SeriesConfig;
}
export function SelectedFilters({ seriesId, series, seriesConfig }: Props) {
  const { reportDefinitions = {} } = series;

  const { labels } = seriesConfig;

  const filters: UrlFilter[] = series.filters ?? [];

  let definitionFilters: UrlFilter[] = getFiltersFromDefs(reportDefinitions);

  const isConfigure = !!useRouteMatch('/exploratory-view/configure');

  // we don't want to display report definition filters in new series view
  if (isConfigure) {
    definitionFilters = [];
  }

  const { removeFilter } = useSeriesFilters({ seriesId, series });

  const { indexPattern } = useAppIndexPatternContext(series.dataType);

  return (filters.length > 0 || definitionFilters.length > 0) && indexPattern ? (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup wrap gutterSize="xs">
        {filters.map(({ field, values, notValues }) => (
          <Fragment key={field}>
            {(values ?? []).map((val) => (
              <EuiFlexItem key={field + val} grow={false} style={{ maxWidth: 300 }}>
                <FilterLabel
                  seriesId={seriesId}
                  series={series}
                  field={field}
                  label={labels[field]}
                  value={val}
                  removeFilter={() => removeFilter({ field, value: val, negate: false })}
                  negate={false}
                  indexPattern={indexPattern}
                />
              </EuiFlexItem>
            ))}
            {(notValues ?? []).map((val) => (
              <EuiFlexItem key={field + val} grow={false} style={{ maxWidth: 300 }}>
                <FilterLabel
                  series={series}
                  seriesId={seriesId}
                  field={field}
                  label={labels[field]}
                  value={val}
                  negate={true}
                  removeFilter={() => removeFilter({ field, value: val, negate: true })}
                  indexPattern={indexPattern}
                />
              </EuiFlexItem>
            ))}
          </Fragment>
        ))}

        {definitionFilters.map(({ field, values }) =>
          values ? (
            <EuiFlexItem key={field} grow={false} style={{ maxWidth: 350 }}>
              <FilterLabel
                series={series}
                seriesId={seriesId}
                field={field}
                label={labels[field]}
                value={values}
                removeFilter={() => {}}
                negate={false}
                definitionFilter={true}
                indexPattern={indexPattern}
              />
            </EuiFlexItem>
          ) : null
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  ) : null;
}
