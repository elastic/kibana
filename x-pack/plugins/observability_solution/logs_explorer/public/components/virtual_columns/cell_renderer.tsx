/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { LogsExplorerDiscoverServices } from '../../controller';
import { VirtualColumnServiceProvider } from '../../hooks/use_virtual_column_services';
import { CONTENT_FIELD, RESOURCE_FIELD } from '../../../common/constants';
import { Content } from './content';
import { Resource } from './resource';

export const renderCell =
  (type: string, { data }: { data: LogsExplorerDiscoverServices['data'] }) =>
  (props: DataGridCellValueElementProps) => {
    const { dataView } = props;
    const virtualColumnServices = {
      data,
      dataView,
    };

    let renderedCell = null;

    switch (type) {
      case CONTENT_FIELD:
        renderedCell = <Content {...props} />;
        break;
      case RESOURCE_FIELD:
        renderedCell = <Resource {...props} />;
        break;
      default:
        break;
    }

    return (
      <VirtualColumnServiceProvider services={virtualColumnServices}>
        {renderedCell}
      </VirtualColumnServiceProvider>
    );
  };
