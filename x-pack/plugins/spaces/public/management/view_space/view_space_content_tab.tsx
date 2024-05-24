/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import type { FC } from 'react';
import React, { useEffect, useState } from 'react';

import { useViewSpaceServices } from './hooks/view_space_context_provider';
import type { Space } from '../../../common';
import type { SpaceContentTypeSummaryItem } from '../../types';

const mapForDisplay = (savedObjectType: string) => {
  switch (savedObjectType) {
    case 'canvas-workpad':
      return {
        icon: 'canvasApp',
        displayName: 'Canvas',
      };
    case 'config':
      return {
        icon: 'advancedSettingsApp',
        displayName: 'Config',
      };
    case 'dashboard':
      return {
        icon: 'dashboardApp',
        displayName: 'Dashboard',
      };
    case 'index-pattern':
      return {
        icon: 'indexSettings',
        displayName: 'Index Pattern',
      };
    case 'graph-workspace':
      return {
        icon: 'graphApp',
        displayName: 'Graph Workspace',
      };
    case 'lens':
      return {
        icon: 'lensApp',
        displayName: 'Lens',
      };
    case 'map':
      return {
        icon: 'emsApp',
        displayName: 'Map',
      };
    case 'search':
      return {
        icon: 'discoverApp',
        displayName: 'Saved Search',
      };
    case 'visualization':
      return {
        icon: 'visualizeApp',
        displayName: 'Visualization',
      };
    default:
      // eslint-disable-next-line no-console
      console.error(`Can not map for display type: ${savedObjectType}`);
      return {
        icon: 'gear',
        displayName: savedObjectType,
      };
  }
};

export const ViewSpaceContent: FC<{ space: Space }> = ({ space }) => {
  const { id: spaceId } = space;
  const { spacesManager } = useViewSpaceServices();
  const [items, setItems] = useState<SpaceContentTypeSummaryItem[] | null>(null);

  const columns: Array<EuiBasicTableColumn<SpaceContentTypeSummaryItem>> = [
    {
      field: 'type',
      name: 'Type',
      render: (value: string) => {
        const { icon, displayName } = mapForDisplay(value);
        return (
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>{displayName}</EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'count',
      name: 'Count',
    },
  ];

  const getRowProps = (item: SpaceContentTypeSummaryItem) => {
    const { type } = item;
    return {
      'data-test-subj': `space-content-row-${type}`,
      onClick: () => {},
    };
  };

  const getCellProps = (
    item: SpaceContentTypeSummaryItem,
    column: EuiTableFieldDataColumnType<SpaceContentTypeSummaryItem>
  ) => {
    const { type } = item;
    const { field } = column;
    return {
      'data-test-subj': `space-content-cell-${type}-${String(field)}`,
      textOnly: true,
    };
  };

  useEffect(() => {
    const getItems = async () => {
      const result = await spacesManager.getContentForSpace(spaceId);
      const { summary } = result;
      setItems(summary);
    };

    // eslint-disable-next-line no-console
    getItems().catch(console.error);
  }, [spaceId, spacesManager]);

  if (!items) {
    return null;
  }

  return (
    <EuiBasicTable
      tableCaption="Demo of EuiBasicTable"
      items={items}
      rowHeader="firstName"
      columns={columns}
      rowProps={getRowProps}
      cellProps={getCellProps}
    />
  );
};
