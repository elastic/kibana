/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Node } from '@xyflow/react';
import type { ServiceNodeData } from '../../../../common/service_map';
import type { ServiceFlyoutOptions } from '../../shared/service_flyout/types';

export function useServiceMapFlyoutProps({
  selectedServiceNodeForFlyout,
  environment,
  flyoutOptions,
  start,
  end,
}: {
  selectedServiceNodeForFlyout: Node<ServiceNodeData> | null;
  environment: string;
  flyoutOptions: ServiceFlyoutOptions | undefined;
  start: string;
  end: string;
}) {
  return useMemo(
    () =>
      selectedServiceNodeForFlyout
        ? {
            service: {
              name: selectedServiceNodeForFlyout.data.id,
              agentName: selectedServiceNodeForFlyout.data.agentName,
              sloStatus: selectedServiceNodeForFlyout.data.sloStatus,
              sloCount: selectedServiceNodeForFlyout.data.sloCount,
            },
            filters: {
              environment,
              rangeFrom: flyoutOptions?.rangeFrom ?? start,
              rangeTo: flyoutOptions?.rangeTo ?? end,
              transactionType: flyoutOptions?.transactionType,
            },
          }
        : null,
    [
      selectedServiceNodeForFlyout,
      environment,
      flyoutOptions?.rangeFrom,
      flyoutOptions?.rangeTo,
      flyoutOptions?.transactionType,
      start,
      end,
    ]
  );
}
