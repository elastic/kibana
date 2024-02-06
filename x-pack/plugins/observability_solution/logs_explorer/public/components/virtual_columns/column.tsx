/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CustomGridColumnProps } from '@kbn/unified-data-table';
import { ContentColumnTooltip } from './column_tooltips/content_column_tooltip';
import { CONTENT_FIELD, RESOURCE_FIELD } from '../../../common/constants';
import { ResourceColumnTooltip } from './column_tooltips/resource_column_tooltip';

export const renderColumn =
  (field: string) =>
  ({ column, headerRowHeight }: CustomGridColumnProps) => {
    switch (field) {
      case CONTENT_FIELD:
        column.display = <ContentColumnTooltip column={column} headerRowHeight={headerRowHeight} />;
        break;
      case RESOURCE_FIELD:
        column.display = (
          <ResourceColumnTooltip column={column} headerRowHeight={headerRowHeight} />
        );
        break;
      default:
        break;
    }
    return column;
  };
