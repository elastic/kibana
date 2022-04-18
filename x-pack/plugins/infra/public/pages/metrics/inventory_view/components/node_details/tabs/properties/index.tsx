/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLoadingChart } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { TabContent, TabProps } from '../shared';
import { Source } from '../../../../../../../containers/metrics_source';
import { findInventoryModel } from '../../../../../../../../common/inventory_models';
import { InventoryItemType } from '../../../../../../../../common/inventory_models/types';
import { useMetadata } from '../../../../../metric_detail/hooks/use_metadata';
import { getFields } from './build_fields';
import { useWaffleTimeContext } from '../../../../hooks/use_waffle_time';
import { Table } from './table';
import { useWaffleFiltersContext } from '../../../../hooks/use_waffle_filters';

const TabComponent = (props: TabProps) => {
  const nodeId = props.node.id;
  const nodeType = props.nodeType as InventoryItemType;
  const inventoryModel = findInventoryModel(nodeType);
  const { sourceId } = useContext(Source.Context);
  const { currentTimeRange } = useWaffleTimeContext();
  const { applyFilterQuery } = useWaffleFiltersContext();
  const { loading: metadataLoading, metadata } = useMetadata(
    nodeId,
    nodeType,
    inventoryModel.requiredMetrics,
    sourceId,
    currentTimeRange
  );

  const hostFields = useMemo(() => {
    if (!metadata) return null;
    return getFields(metadata, 'host');
  }, [metadata]);

  const cloudFields = useMemo(() => {
    if (!metadata) return null;
    return getFields(metadata, 'cloud');
  }, [metadata]);

  const agentFields = useMemo(() => {
    if (!metadata) return null;
    return getFields(metadata, 'agent');
  }, [metadata]);

  const onFilter = useCallback(
    (item: { name: string; value: string }) => {
      applyFilterQuery({
        kind: 'kuery',
        expression: `${item.name}: "${item.value}"`,
      });
    },
    [applyFilterQuery]
  );

  if (metadataLoading) {
    return <LoadingPlaceholder />;
  }

  return (
    <TabContent>
      {hostFields && hostFields.length > 0 && (
        <TableWrapper>
          <Table
            title={i18n.translate('xpack.infra.nodeDetails.tabs.metadata.hostsHeader', {
              defaultMessage: 'Hosts',
            })}
            onClick={onFilter}
            rows={hostFields}
          />
        </TableWrapper>
      )}
      {cloudFields && cloudFields.length > 0 && (
        <TableWrapper>
          <Table
            title={i18n.translate('xpack.infra.nodeDetails.tabs.metadata.cloudHeader', {
              defaultMessage: 'Cloud',
            })}
            onClick={onFilter}
            rows={cloudFields}
          />
        </TableWrapper>
      )}
      {agentFields && agentFields.length > 0 && (
        <TableWrapper>
          <Table
            title={i18n.translate('xpack.infra.nodeDetails.tabs.metadata.agentHeader', {
              defaultMessage: 'Agent',
            })}
            onClick={onFilter}
            rows={agentFields}
          />
        </TableWrapper>
      )}
    </TabContent>
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
