/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiButtonEmpty, EuiFlexItem, EuiFlexGroup, EuiFilterGroup } from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';
import { FilterExpanded } from './filter_expanded';
import { SeriesConfig } from '../../types';
import { FieldLabels } from '../../configurations/constants/constants';
import { SelectedFilters } from '../selected_filters';
import { useSeriesStorage } from '../../hooks/use_series_storage';

interface Props {
  seriesId: string;
  seriesConfig: SeriesConfig;
  isNew?: boolean;
  labels?: Record<string, string>;
}

export interface Field {
  label: string;
  field: string;
  nested?: string;
  isNegated?: boolean;
}

export function SeriesFilter({ seriesConfig, seriesId, labels }: Props) {
  const isPreview = !!useRouteMatch('/exploratory-view/preview');

  const options: Field[] = seriesConfig.filterFields.map((field) => {
    if (typeof field === 'string') {
      return { label: labels?.[field] ?? FieldLabels[field], field };
    }

    return {
      field: field.field,
      nested: field.nested,
      isNegated: field.isNegated,
      label: labels?.[field.field] ?? FieldLabels[field.field],
    };
  });

  const { setSeries, getSeries } = useSeriesStorage();
  const urlSeries = getSeries(seriesId);

  const mainPanel = (
    <EuiFilterGroup>
      {options.map((opt) => (
        <FilterExpanded
          key={opt.label}
          seriesId={seriesId}
          field={opt.field}
          label={opt.label}
          nestedField={opt.nested}
          isNegated={opt.isNegated}
          filters={seriesConfig.baseFilters}
        />
      ))}
    </EuiFilterGroup>
  );

  return (
    <EuiFlexGroup wrap gutterSize="xs" alignItems="flexStart">
      {!isPreview && <EuiFlexItem>{mainPanel}</EuiFlexItem>}
      <SelectedFilters seriesId={seriesId} seriesConfig={seriesConfig} />
      {(urlSeries.filters ?? []).length > 0 && !isPreview && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="left"
            color="text"
            iconType="cross"
            onClick={() => {
              setSeries(seriesId, { ...urlSeries, filters: undefined });
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
