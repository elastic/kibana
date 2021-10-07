/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFilterGroup, EuiSpacer } from '@elastic/eui';
import { FilterExpanded } from './filter_expanded';
import { SeriesConfig, SeriesUrl } from '../../types';
import { FieldLabels, LABEL_FIELDS_FILTER } from '../../configurations/constants/constants';
import { SelectedFilters } from './selected_filters';
import { LabelsFieldFilter } from '../components/labels_filter';

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
  const options: Field[] = seriesConfig.filterFields.map((field) => {
    if (typeof field === 'string') {
      return { label: seriesConfig.labels?.[field] ?? FieldLabels[field], field };
    }

    return {
      field: field.field,
      nestedField: field.nested,
      isNegated: field.isNegated,
      label: seriesConfig.labels?.[field.field] ?? FieldLabels[field.field],
    };
  });

  return (
    <>
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
      <EuiSpacer size="s" />
      <SelectedFilters seriesId={seriesId} series={series} seriesConfig={seriesConfig} />
    </>
  );
}
