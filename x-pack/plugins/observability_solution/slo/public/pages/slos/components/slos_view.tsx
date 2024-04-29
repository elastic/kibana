/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { SloListCardView } from './card_view/slos_card_view';
import { SloListCompactView } from './compact_view/slo_list_compact_view';
import { SloListEmpty } from './slo_list_empty';
import { SloListError } from './slo_list_error';
import { SloListView } from './slo_list_view/slo_list_view';
import { SLOView } from './toggle_slo_view';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
  sloView: SLOView;
}

export function SlosView({ sloList, loading, error, sloView }: Props) {
  if (!loading && !error && sloList.length === 0) {
    return <SloListEmpty />;
  }

  if (!loading && error) {
    return <SloListError />;
  }

  if (sloView === 'cardView') {
    return (
      <EuiFlexItem>
        <SloListCardView sloList={sloList} loading={loading} error={error} />
      </EuiFlexItem>
    );
  }

  if (sloView === 'compactView') {
    return (
      <EuiFlexItem>
        <SloListCompactView sloList={sloList} loading={loading} error={error} />
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexItem>
      <SloListView sloList={sloList} loading={loading} error={error} />
    </EuiFlexItem>
  );
}
