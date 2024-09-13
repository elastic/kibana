/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiTableFieldDataColumnType } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import type { FC } from 'react';
import React, { useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { handleApiError } from './handle_api_error';
import { useEditSpaceServices } from './provider';
import { addSpaceIdToPath, ENTER_SPACE_PATH, type Space } from '../../../common';
import type { SpaceContentTypeSummaryItem } from '../../types';

export const EditSpaceContentTab: FC<{ space: Space }> = ({ space }) => {
  const { id: spaceId } = space;
  const { spacesManager, serverBasePath, logger, notifications } = useEditSpaceServices();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<SpaceContentTypeSummaryItem[] | null>(null);

  const columns: Array<EuiBasicTableColumn<SpaceContentTypeSummaryItem>> = [
    {
      field: 'type',
      name: 'Type',
      render: (_value: string, item: SpaceContentTypeSummaryItem) => {
        const { icon, displayName } = item;
        return (
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon ?? 'gear'} size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>{capitalize(displayName)}</EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'count',
      name: 'Count',
      render: (value: string, item: SpaceContentTypeSummaryItem) => {
        const uriComponent = encodeURIComponent(
          `/app/management/kibana/objects?initialQuery=type:(${item.type})`
        );
        const href = addSpaceIdToPath(
          serverBasePath,
          space.id,
          `${ENTER_SPACE_PATH}?next=${uriComponent}`
        );
        return <EuiLink href={href}>{value}</EuiLink>;
      },
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
      setIsLoading(false);
    };

    getItems().catch((error) => {
      handleApiError(error, { logger, toasts: notifications.toasts });
    });
  }, [spaceId, spacesManager, logger, notifications.toasts]);

  if (isLoading) {
    return (
      <EuiFlexGroup
        justifyContent="spaceAround"
        data-test-subj="editSpaceContentTabLoadingIndicator"
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xxl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!items) {
    return null;
  }

  return (
    <EuiBasicTable
      data-test-subj="editSpaceContentTab"
      tableCaption={i18n.translate('xpack.spaces.management.editSpaceContent.listTableCaption', {
        defaultMessage: 'List of saved object content within the space',
      })}
      items={items}
      rowHeader="type"
      columns={columns}
      rowProps={getRowProps}
      cellProps={getCellProps}
    />
  );
};
