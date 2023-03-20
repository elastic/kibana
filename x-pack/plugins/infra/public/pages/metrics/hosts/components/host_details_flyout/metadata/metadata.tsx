/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLoadingChart } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { useSourceContext } from '../../../../../../containers/metrics_source';
import { findInventoryModel } from '../../../../../../../common/inventory_models';
import type { InventoryItemType } from '../../../../../../../common/inventory_models/types';
import { useMetadata } from '../../../../metric_detail/hooks/use_metadata';
import { Table } from './table';
import { getAllFields } from './utils';
import type { HostNodeRow } from '../../../hooks/use_hosts_table';
import type { MetricsTimeInput } from '../../../../metric_detail/hooks/use_metrics_time';

const NODE_TYPE = 'host' as InventoryItemType;

export interface TabProps {
  currentTimeRange: MetricsTimeInput;
  node: HostNodeRow;
}

const Metadata = ({ node, currentTimeRange }: TabProps) => {
  const nodeId = node.name;
  const inventoryModel = findInventoryModel(NODE_TYPE);
  const { sourceId } = useSourceContext();
  const { loading: metadataLoading, metadata } = useMetadata(
    nodeId,
    NODE_TYPE,
    inventoryModel.requiredMetrics,
    sourceId,
    currentTimeRange
  );

  const fields = useMemo(() => getAllFields(metadata), [metadata]);

  if (metadataLoading) {
    return <LoadingPlaceholder />;
  }

  return fields.length > 0 ? (
    <Table rows={fields} />
  ) : (
    <EuiText>
      {i18n.translate('xpack.infra.hostsViewPage.hostDetail.metadata.noMetadataFound', {
        defaultMessage: 'No metadata found for this host',
      })}
    </EuiText>
  );
};

const LoadingPlaceholder = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '200px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <EuiLoadingChart size="xl" />
    </div>
  );
};

export const MetadataTab = {
  id: 'properties',
  name: i18n.translate('xpack.infra.nodeDetails.tabs.metadata.title', {
    defaultMessage: 'Metadata',
  }),
  content: Metadata,
};
