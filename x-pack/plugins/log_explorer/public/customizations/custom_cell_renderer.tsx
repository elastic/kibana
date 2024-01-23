/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CONTENT_FIELD } from '../../common/constants';
import { renderContent } from '../components/virtual_columns/content';

export const createCustomCellRenderer = ({ data }: { data: DataPublicPluginStart }) => {
  return {
    [CONTENT_FIELD]: renderContent({ data }),
  };
};
