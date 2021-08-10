/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FilterLabel } from '../components/filter_label';
import { SeriesConfig, SeriesUrl, UrlFilter } from '../types';
import { useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { useSeriesFilters } from '../hooks/use_series_filters';
import { getFiltersFromDefs } from '../hooks/use_lens_attributes';
import { useSeriesStorage } from '../hooks/use_series_storage';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  seriesConfig: SeriesConfig;
}
export function SelectedFilters({ seriesId, series, seriesConfig }: Props) {
  const { setSeries } = useSeriesStorage();

  const isPreview = !!useRouteMatch('/exploratory-view/preview');

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

  if ((filters.length === 0 && definitionFilters.length === 0) || !indexPattern) {
    return null;
  }

  return (
    <EuiFlexGroup wrap gutterSize="xs">
      {filters.map(({ field, values, notValues }) => (
        <Fragment key={field}>
          {(values ?? []).length > 0 && (
            <EuiFlexItem grow={false} style={{ maxWidth: 300 }}>
              <FilterLabel
                seriesId={seriesId}
                series={series}
                field={field}
                label={labels[field]}
                value={values ?? []}
                removeFilter={() => {
                  values?.forEach((val) => {
                    removeFilter({ field, value: val, negate: false });
                  });
                }}
                negate={false}
                indexPattern={indexPattern}
              />
            </EuiFlexItem>
          )}
          {(notValues ?? []).length > 0 && (
            <EuiFlexItem key={field} grow={false} style={{ maxWidth: 300 }}>
              <FilterLabel
                series={series}
                seriesId={seriesId}
                field={field}
                label={labels[field]}
                value={notValues ?? []}
                negate={true}
                removeFilter={() => {
                  values?.forEach((val) => {
                    removeFilter({ field, value: val, negate: false });
                  });
                }}
                indexPattern={indexPattern}
              />
            </EuiFlexItem>
          )}
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

      {(series.filters ?? []).length > 0 && !isPreview && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="left"
            color="text"
            iconType="cross"
            onClick={() => {
              setSeries(seriesId, { ...series, filters: undefined });
            }}
            size="s"
          >
            {i18n.translate('xpack.observability.expView.seriesEditor.clearFilter', {
              defaultMessage: 'Clear filters',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
