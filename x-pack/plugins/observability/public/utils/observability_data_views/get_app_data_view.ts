/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDataType } from '../../components/shared/exploratory_view/types';
import type { DataViewsPublicPluginStart } from '../../../../../../src/plugins/data_views/public';

const getAppDataView = (data: DataViewsPublicPluginStart) => {
  return async (appId: AppDataType, indexPattern?: string) => {
    try {
      const { ObservabilityDataViews } = await import('./observability_data_views');

      const obsvIndexP = new ObservabilityDataViews(data);
      return await obsvIndexP.getDataView(appId, indexPattern);
    } catch (e) {
      return null;
    }
  };
};

// eslint-disable-next-line import/no-default-export
export default getAppDataView;
