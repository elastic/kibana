/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { injectI18n } from '@kbn/i18n-react';
import { Filter, buildPhrasesFilter, buildPhraseFilter } from '@kbn/es-query';
import { FilterItem } from '@kbn/unified-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export function buildFilterLabel({
  field,
  value,
  label,
  dataView,
  negate,
}: {
  label: string;
  value: string | Array<string | number>;
  negate: boolean;
  field: string;
  dataView: DataView;
}) {
  const indexField = dataView.getFieldByName(field)!;
  const areMultipleValues = Array.isArray(value) && value.length > 1;
  const filter = areMultipleValues
    ? buildPhrasesFilter(indexField, value, dataView)
    : buildPhraseFilter(indexField, Array.isArray(value) ? value[0] : value, dataView);

  filter.meta.type = areMultipleValues ? 'phrases' : 'phrase';

  filter.meta.value = Array.isArray(value)
    ? !areMultipleValues
      ? `${value[0]}`
      : undefined
    : value;

  filter.meta.key = label;
  filter.meta.alias = null;
  filter.meta.negate = negate;
  filter.meta.disabled = false;

  return filter;
}

export interface FilterValueLabelProps {
  field: string;
  label: string;
  value: string | Array<string | number>;
  negate: boolean;
  removeFilter: (field: string, value: string | Array<string | number>, notVal: boolean) => void;
  invertFilter: (val: {
    field: string;
    value: string | Array<string | number>;
    negate: boolean;
  }) => void;
  dataView: DataView;
  allowExclusion?: boolean;
}
export function FilterValueLabel({
  label,
  field,
  value,
  negate,
  dataView,
  invertFilter,
  removeFilter,
  allowExclusion = true,
}: FilterValueLabelProps) {
  const FilterItemI18n = injectI18n(FilterItem);

  const filter = buildFilterLabel({ field, value, label, dataView, negate });

  const {
    services: { uiSettings },
  } = useKibana();

  return dataView ? (
    <FilterItemI18n
      indexPatterns={[dataView]}
      id={`${field}-${value}-${negate}`}
      filter={filter}
      onRemove={() => {
        removeFilter(field, value, false);
      }}
      onUpdate={(filterN: Filter) => {
        if (filterN.meta.negate !== negate) {
          invertFilter({ field, value, negate });
        }
      }}
      uiSettings={uiSettings!}
      hiddenPanelOptions={[
        ...(allowExclusion ? [] : ['negateFilter' as const]),
        'pinFilter',
        'editFilter',
        'disableFilter',
      ]}
    />
  ) : null;
}

// eslint-disable-next-line import/no-default-export
export default FilterValueLabel;
