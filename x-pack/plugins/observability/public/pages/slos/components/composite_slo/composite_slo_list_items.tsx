/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { CompositeSLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { ListEmpty } from '../list_empty';
import { ListError } from '../list_error';
import { CompositeSloListItem } from './composite_slo_list_item';

export interface Props {
  compositeSloList: CompositeSLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
}

export function CompositeSloListItems({ compositeSloList, loading, error }: Props) {
  if (!loading && !error && compositeSloList.length === 0) {
    return <ListEmpty />;
  }
  if (!loading && error) {
    return <ListError />;
  }

  const handleDelete = (slo: CompositeSLOWithSummaryResponse) => {};

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {compositeSloList.map((compositeSlo) => (
        <EuiFlexItem key={compositeSlo.id}>
          <CompositeSloListItem compositeSlo={compositeSlo} onConfirmDelete={handleDelete} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
