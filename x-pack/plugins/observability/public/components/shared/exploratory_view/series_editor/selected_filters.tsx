/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { useUrlStorage } from '../hooks/use_url_strorage';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FILTERS } from '../configurations/constants';
import { FilterLabel } from '../components/filter_label';
import { DataSeries } from '../types';

interface Props {
  seriesId: string;
  series: DataSeries;
}
export const SelectedFilters = ({ seriesId, series: { labels } }: Props) => {
  const { series, setSeries } = useUrlStorage(seriesId);

  const filters = series?.[FILTERS] ?? [];

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
    setSeries(seriesId, { ...series, [FILTERS]: filtersN });
  };

  return filters.length > 0 ? (
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
