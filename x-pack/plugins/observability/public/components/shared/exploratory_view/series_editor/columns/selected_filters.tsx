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
import { useAppDataViewContext } from '../../hooks/use_app_data_view';
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

  const { removeFilter, replaceFilter } = useSeriesFilters({ seriesId, series });

  const { dataView } = useAppDataViewContext(series.dataType);

  if (filters.length === 0 || !dataView) {
    return null;
  }

  const btnProps = {
    seriesId,
    series,
    dataView,
  };

  return (
    <>
      <EuiFlexGroup wrap gutterSize="xs" alignItems="center">
        {filters.map(
          ({ field, values = [], notValues = [], wildcards = [], notWildcards = [] }) => (
            <Fragment key={field}>
              {values.length > 0 && (
                <EuiFlexItem grow={false} style={{ maxWidth: 300 }}>
                  <FilterLabel
                    field={field}
                    label={labels[field] ?? field}
                    value={values ?? []}
                    removeFilter={() => {
                      replaceFilter({
                        field,
                        values: [],
                        notValues,
                        wildcards,
                        notWildcards,
                      });
                    }}
                    negate={false}
                    {...btnProps}
                  />
                </EuiFlexItem>
              )}
              {notValues.length > 0 && (
                <EuiFlexItem key={field} grow={false} style={{ maxWidth: 300 }}>
                  <FilterLabel
                    field={field}
                    label={labels[field] ?? field}
                    value={notValues ?? []}
                    negate={true}
                    removeFilter={() => {
                      replaceFilter({
                        field,
                        notValues: [],
                        values,
                        wildcards,
                        notWildcards,
                      });
                    }}
                    {...btnProps}
                  />
                </EuiFlexItem>
              )}
              {wildcards.length > 0 && (
                <EuiFlexItem key={field} grow={false} style={{ maxWidth: 300 }}>
                  <FilterLabel
                    field={field}
                    label={i18n.translate('xpack.observability.filters.label.wildcard', {
                      defaultMessage: '{label} wildcard',
                      values: { label: labels[field] ?? field },
                    })}
                    value={wildcards ?? []}
                    negate={false}
                    removeFilter={() => {
                      wildcards?.forEach((val) => {
                        removeFilter({ field, value: val, negate: false, isWildcard: true });
                      });
                    }}
                    {...btnProps}
                  />
                </EuiFlexItem>
              )}
              {notWildcards.length > 0 && (
                <EuiFlexItem key={field} grow={false} style={{ maxWidth: 300 }}>
                  <FilterLabel
                    field={field}
                    label={i18n.translate('xpack.observability.filters.label.wildcard', {
                      defaultMessage: '{label} wildcard',
                      values: { label: labels[field] ?? field },
                    })}
                    value={notWildcards ?? []}
                    negate={false}
                    removeFilter={() => {
                      notWildcards?.forEach((val) => {
                        removeFilter({ field, value: val, negate: true, isWildcard: true });
                      });
                    }}
                    {...btnProps}
                  />
                </EuiFlexItem>
              )}
            </Fragment>
          )
        )}

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
