/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { MetricsTimeInput } from '../../../../pages/metrics/metric_detail/hooks/use_metrics_time';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useSourceContext } from '../../../../containers/metrics_source';
import { findInventoryModel } from '../../../../../common/inventory_models';
import { InventoryItemType } from '../../../../../common/inventory_models/types';
import { useMetadata } from '../../hooks/use_metadata';

export interface OSQueryProps {
  nodeName: string;
  nodeType: InventoryItemType;
  currentTimeRange: MetricsTimeInput;
}

export const OSQuery = ({ nodeName, nodeType, currentTimeRange }: OSQueryProps) => {
  const inventoryModel = findInventoryModel(nodeType);
  const { sourceId } = useSourceContext();
  const { loading, metadata } = useMetadata(
    nodeName,
    nodeType,
    inventoryModel.requiredMetrics,
    sourceId,
    currentTimeRange
  );
  const {
    services: { osquery },
  } = useKibanaContextForPlugin();
  // @ts-expect-error
  const OsqueryAction = osquery?.OsqueryAction;

  // avoids component rerender when resizing the popover
  const content = useMemo(() => {
    // TODO: Add info when Osquery plugin is not available
    if (loading || !OsqueryAction) {
      return <EuiSkeletonText lines={10} />;
    }

    return <OsqueryAction agentId={metadata?.info?.agent?.id} hideAgentsField />;
  }, [OsqueryAction, loading, metadata]);

  return content;
};
