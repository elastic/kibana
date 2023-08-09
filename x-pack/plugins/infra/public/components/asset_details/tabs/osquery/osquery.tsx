/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useSourceContext } from '../../../../containers/metrics_source';
import { findInventoryModel } from '../../../../../common/inventory_models';
import { useMetadata } from '../../hooks/use_metadata';
import { useAssetDetailsStateContext } from '../../hooks/use_asset_details_state';

export const Osquery = () => {
  const { node, nodeType, dateRangeTs } = useAssetDetailsStateContext();
  const inventoryModel = findInventoryModel(nodeType);
  const { sourceId } = useSourceContext();
  const { loading, metadata } = useMetadata(
    node.name,
    nodeType,
    inventoryModel.requiredMetrics,
    sourceId,
    dateRangeTs
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

    return <OsqueryAction agentId={metadata?.info?.agent?.id} hideAgentsField formType="simple" />;
  }, [OsqueryAction, loading, metadata]);

  return content;
};
