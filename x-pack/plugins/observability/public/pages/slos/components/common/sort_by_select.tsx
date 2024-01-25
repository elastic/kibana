/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiSelectOption } from '@elastic/eui/src/components/form/select/select';
import { SortField } from '../slo_list_search_bar';
import { SearchState } from '../../hooks/use_url_search_state';

interface Props {
  initialState: SearchState;
  loading: boolean;
  onStateChange: (newState: Partial<SearchState>) => void;
}

export function SortBySelect({ initialState, onStateChange, loading }: Props) {
  return (
    <EuiSelect
      data-test-subj="o11ySortBySelectSelect"
      compressed
      prepend={SORT_BY_LABEL}
      options={SORT_OPTIONS}
      value={initialState.sort.by}
      onChange={(evt) => {
        onStateChange({
          page: 0,
          sort: { by: evt.target.value as SortField, direction: initialState.sort.direction },
        });
      }}
    />
  );
}

const SORT_OPTIONS: EuiSelectOption[] = [
  {
    text: i18n.translate('xpack.observability.slo.list.sortBy.sliValue', {
      defaultMessage: 'SLI value',
    }),
    value: 'sli_value',
  },
  {
    text: i18n.translate('xpack.observability.slo.list.sortBy.sloStatus', {
      defaultMessage: 'SLO status',
    }),
    value: 'status',
  },
  {
    text: i18n.translate('xpack.observability.slo.list.sortBy.errorBudgetConsumed', {
      defaultMessage: 'Error budget consumed',
    }),
    value: 'error_budget_consumed',
  },
  {
    text: i18n.translate('xpack.observability.slo.list.sortBy.errorBudgetRemaining', {
      defaultMessage: 'Error budget remaining',
    }),
    value: 'error_budget_remaining',
  },
];

const SORT_BY_LABEL = i18n.translate('xpack.observability.slo.list.sortByTypeLabel', {
  defaultMessage: 'Sort by',
});
