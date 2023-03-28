/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';

import { SloStatusBadge } from '../../../components/slo/slo_status_badge';

export interface Props {
  slo: SLOWithSummaryResponse | undefined;
  isLoading: boolean;
}

export function HeaderTitle(props: Props) {
  const { isLoading, slo } = props;
  if (isLoading) {
    return <EuiLoadingSpinner data-test-subj="loadingTitle" />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>{slo && slo.name}</EuiFlexItem>
      {!!slo && (
        <EuiFlexItem>
          <SloStatusBadge slo={slo} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
