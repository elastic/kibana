/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { injectI18n } from '@kbn/i18n/react';
import { esFilters, Filter, IndexPattern } from '../../../../../../../src/plugins/data/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

export function buildFilterLabel({
  field,
  value,
  label,
  indexPattern,
  negate,
}: {
  label: string;
  value: string;
  negate: boolean;
  field: string;
  indexPattern: IndexPattern;
}) {
  const indexField = indexPattern.getFieldByName(field)!;

  const filter = esFilters.buildPhraseFilter(indexField, value, indexPattern);

  filter.meta.value = value;
  filter.meta.key = label;
  filter.meta.alias = null;
  filter.meta.negate = negate;
  filter.meta.disabled = false;
  filter.meta.type = 'phrase';

  return filter;
}

interface Props {
  field: string;
  label: string;
  value: string;
  negate: boolean;
  removeFilter: (field: string, value: string, notVal: boolean) => void;
  invertFilter: (val: { field: string; value: string; negate: boolean }) => void;
  indexPattern: IndexPattern;
}
export function FilterValueLabel({
  label,
  field,
  value,
  negate,
  indexPattern,
  invertFilter,
  removeFilter,
}: Props) {
  const FilterItem = injectI18n(esFilters.FilterItem);

  const filter = buildFilterLabel({ field, value, label, indexPattern, negate });

  const {
    services: { uiSettings },
  } = useKibana();

  return indexPattern ? (
    <FilterItem
      indexPatterns={[indexPattern]}
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
      hiddenPanelOptions={['pinFilter', 'editFilter', 'disableFilter']}
    />
  ) : null;
}
