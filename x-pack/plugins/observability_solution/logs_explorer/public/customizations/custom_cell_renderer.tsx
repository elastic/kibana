/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CONTENT_FIELD, RESOURCE_FIELD } from '../../common/constants';
import { renderCell } from '../components/virtual_columns/cell_renderer';

export const createCustomCellRenderer = ({ data }: { data: DataPublicPluginStart }) => {
  return {
    [CONTENT_FIELD]: renderCell(CONTENT_FIELD, { data }),
    [RESOURCE_FIELD]: renderCell(RESOURCE_FIELD, { data }),
  };
};
