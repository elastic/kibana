/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { TIMESTAMP_FIELD } from '../../../common/constants';
import { LogView, LogViewFieldColumnConfiguration } from '../../../common/log_views';
import { ILogsAppClient } from './types';

export class LogsAppClient implements ILogsAppClient {
  constructor(private readonly discover: DiscoverStart) {}

  public redirectToDiscover({ logView }: { logView: LogView }): void {
    const { logIndices, logColumns } = logView.attributes;

    const columns = getColumns(logColumns);
    const dataViewId = getDataViewId(logIndices);

    this.discover.locator?.navigate({
      dataViewId,
      dataViewSpec: {
        id: generateDataViewId(dataViewId),
        title: dataViewId,
        timeFieldName: TIMESTAMP_FIELD,
      },
      columns,
    });
  }
}

const getDataViewId = (logIndices: LogView['attributes']['logIndices']) => {
  return logIndices.type === 'data_view' ? logIndices.dataViewId : logIndices.indexName;
};

const getColumns = (logColumns: LogView['attributes']['logColumns']) => {
  return [TIMESTAMP_FIELD, getFieldColumnValue(logColumns), 'message'].filter(Boolean) as string[];
};

const getFieldColumnValue = (logColumns: LogView['attributes']['logColumns']) => {
  const column = logColumns.find((col) => 'fieldColumn' in col) as
    | LogViewFieldColumnConfiguration
    | undefined;

  return column?.fieldColumn.field;
};

const generateDataViewId = (indexPattern: string) => {
  // generates a unique but the same uuid as long as the index pattern doesn't change
  return `infra_logs_${uuidv5(indexPattern, uuidv5.DNS)}`;
};
