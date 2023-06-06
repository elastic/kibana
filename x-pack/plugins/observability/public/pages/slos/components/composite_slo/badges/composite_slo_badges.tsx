/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiSkeletonRectangle } from '@elastic/eui';
import { CompositeSLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { SloStatusBadge } from '../../../../../components/slo/slo_status_badge';
import { SloTimeWindowBadge } from '../../slo/badges/slo_time_window_badge';

export interface Props {
  isLoading: boolean;
  compositeSlo: CompositeSLOWithSummaryResponse;
}

export function CompositeSloBadges({ isLoading, compositeSlo }: Props) {
  return (
    <EuiFlexGroup direction="row" responsive={false} gutterSize="s" alignItems="center">
      {isLoading ? (
        <>
          <EuiSkeletonRectangle
            isLoading
            contentAriaLabel="Loading"
            width="54.16px"
            height="20px"
            borderRadius="s"
          />
          <EuiSkeletonRectangle
            isLoading
            contentAriaLabel="Loading"
            width="54.16px"
            height="20px"
            borderRadius="s"
          />
          <EuiSkeletonRectangle
            isLoading
            contentAriaLabel="Loading"
            width="54.16px"
            height="20px"
            borderRadius="s"
          />
        </>
      ) : (
        <>
          <SloStatusBadge slo={compositeSlo} />
          <SloTimeWindowBadge slo={compositeSlo} />
        </>
      )}
    </EuiFlexGroup>
  );
}
