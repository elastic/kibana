/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SloListItem } from './slo_list_item';
import { SloListEmpty } from './slo_list_empty';
import { filterSlos } from '../helpers/filter_slos';
import { SLO } from '../../../typings';
import { SortItem } from './slo_list_search_filter_sort_bar';
import { SloListError } from './slo_list_error';

export interface SloListItemsProps {
  slos: SLO[];
  loading: boolean;
  error: boolean;
  filters: SortItem[];
  onDeleted: () => void;
  onDeleting: () => void;
}

export function SloListItems({
  slos,
  loading,
  error,
  filters,
  onDeleted,
  onDeleting,
}: SloListItemsProps) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {slos.length
        ? slos.filter(filterSlos(filters)).map((slo) => (
            <EuiFlexItem key={slo.id}>
              <SloListItem slo={slo} onDeleted={onDeleted} onDeleting={onDeleting} />
            </EuiFlexItem>
          ))
        : null}
      {!loading && slos.length === 0 && !error ? <SloListEmpty /> : null}
      {!loading && slos.length === 0 && error ? <SloListError /> : null}
    </EuiFlexGroup>
  );
}
