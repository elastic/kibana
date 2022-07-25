/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import type { DataView } from '@kbn/data-plugin/common';

import { useKibana } from '../lib/kibana';

export interface LogsDataView extends DataView {
  id: string;
}

export const useLogsDataView = () => {
  const dataViews = useKibana().services.data.dataViews;

  return useQuery<LogsDataView>(['logsDataView'], async () => {
    let dataView = (await dataViews.find('logs-osquery_manager.result*', 1))[0];
    if (!dataView && dataViews.getCanSaveSync()) {
      dataView = await dataViews.createAndSave({
        title: 'logs-osquery_manager.result*',
        timeFieldName: '@timestamp',
      });
    }

    return dataView as LogsDataView;
  });
};
