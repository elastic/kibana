/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLoadingChart } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useSourceContext } from '../../../../../../containers/metrics_source';
import { findInventoryModel } from '../../../../../../../common/inventory_models';
import type { InventoryItemType } from '../../../../../../../common/inventory_models/types';
import { useMetadata } from '../../../../metric_detail/hooks/use_metadata';
import { Table } from './table';
import { useWaffleTimeContext } from '../../../../inventory_view/hooks/use_waffle_time';
import { getAllFields } from './build_fields';
import { HostNodeRow } from '../../../hooks/use_hosts_table';

const NODE_TYPE = 'host' as InventoryItemType;

export interface TabProps {
  currentTime: number;
  node: HostNodeRow;
  onClose?(): void;
}

const TabComponent = (props: TabProps) => {
  const nodeId = props.node.name;
  const inventoryModel = findInventoryModel(NODE_TYPE);
  const { sourceId } = useSourceContext();
  const { currentTimeRange } = useWaffleTimeContext();
  const { loading: metadataLoading, metadata } = useMetadata(
    nodeId,
    NODE_TYPE,
    inventoryModel.requiredMetrics,
    sourceId,
    currentTimeRange
  );

  const fields = useMemo(() => {
    if (!metadata) return [];
    return getAllFields(metadata);
  }, [metadata]);

  if (metadataLoading) {
    return <LoadingPlaceholder />;
  }

  return (
    <>
      {metadata && (
        <TableWrapper>
          <Table rows={fields} />
        </TableWrapper>
      )}
    </>
  );
};

const TableWrapper = euiStyled.div`
  &:not(:last-child) {
    margin-bottom: 16px
  }
`;

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

export const PropertiesTab = {
  id: 'properties',
  name: i18n.translate('xpack.infra.nodeDetails.tabs.metadata.title', {
    defaultMessage: 'Metadata',
  }),
  content: TabComponent,
};
