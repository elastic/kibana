/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FilterLabel } from '../../components/filter_label';
import { SeriesConfig, SeriesUrl, UrlFilter } from '../../types';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';
import { useSeriesFilters } from '../../hooks/use_series_filters';
import { useSeriesStorage } from '../../hooks/use_series_storage';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  seriesConfig: SeriesConfig;
}
export function SelectedFilters({ seriesId, series, seriesConfig }: Props) {
  const { setSeries } = useSeriesStorage();

  const { labels } = seriesConfig;

  const filters: UrlFilter[] = series.filters ?? [];

  const { removeFilter } = useSeriesFilters({ seriesId, series });

  const { indexPattern } = useAppIndexPatternContext(series.dataType);

  if (filters.length === 0 || !indexPattern) {
    return null;
  }

  return (
    <>
      <EuiFlexGroup wrap gutterSize="xs">
        {filters.map(({ field, values, notValues }) => (
          <Fragment key={field}>
            {(values ?? []).length > 0 && (
              <EuiFlexItem grow={false} style={{ maxWidth: 300 }}>
                <FilterLabel
                  seriesId={seriesId}
                  series={series}
                  field={field}
                  label={labels[field] ?? field}
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
                  label={labels[field] ?? field}
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

        {(series.filters ?? []).length > 0 && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              iconType="cross"
              onClick={() => {
                setSeries(seriesId, { ...series, filters: undefined });
              }}
              size="xs"
            >
              {i18n.translate('xpack.observability.expView.seriesEditor.clearFilter', {
                defaultMessage: 'Clear filters',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
}
