/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { SloListItem } from './slo_list_item';
import { SloListEmpty } from './slo_list_empty';
import { SloListError } from './slo_list_error';

export interface SloListItemsProps {
  slos: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
  onDeleted: () => void;
  onDeleting: () => void;
}

export function SloListItems({ slos, loading, error, onDeleted, onDeleting }: SloListItemsProps) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {slos.length
        ? slos.map((slo) => (
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
