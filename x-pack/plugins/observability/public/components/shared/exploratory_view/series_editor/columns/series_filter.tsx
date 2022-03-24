/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFilterGroup, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FilterExpanded } from './filter_expanded';
import { SeriesConfig, SeriesUrl } from '../../types';
import { FieldLabels, LABEL_FIELDS_FILTER } from '../../configurations/constants/constants';
import { SelectedFilters } from './selected_filters';
import { LabelsFieldFilter } from '../components/labels_filter';
import { URLSearch } from '../../components/url_search/url_search';
import { TRANSACTION_URL } from '../../configurations/constants/elasticsearch_fieldnames';

interface Props {
  seriesId: number;
  seriesConfig: SeriesConfig;
  series: SeriesUrl;
}

export interface Field {
  label: string;
  field: string;
  nestedField?: string;
  isNegated?: boolean;
}

export function SeriesFilter({ series, seriesConfig, seriesId }: Props) {
  const options: Field[] = seriesConfig.filterFields
    .filter((field) => field !== TRANSACTION_URL)
    .map((field) => {
      if (typeof field === 'string') {
        return { label: seriesConfig.labels?.[field] ?? FieldLabels[field] ?? field, field };
      }

      return {
        field: field.field,
        nestedField: field.nested,
        isNegated: field.isNegated,
        label: (seriesConfig.labels?.[field.field] ?? FieldLabels[field.field]) || field.field,
      };
    });

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <URLSearch series={series} seriesId={seriesId} seriesConfig={seriesConfig} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFilterGroup>
            {options.map((opt) =>
              opt.field === LABEL_FIELDS_FILTER ? (
                <LabelsFieldFilter
                  series={series}
                  key={opt.label}
                  seriesId={seriesId}
                  baseFilters={seriesConfig.baseFilters}
                  {...opt}
                />
              ) : (
                <FilterExpanded
                  series={series}
                  key={opt.label}
                  seriesId={seriesId}
                  baseFilters={seriesConfig.baseFilters}
                  {...opt}
                />
              )
            )}
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <SelectedFilters seriesId={seriesId} series={series} seriesConfig={seriesConfig} />
    </>
  );
}
