/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsync from 'react-use/lib/useAsync';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_LOG_VIEW, LogViewReference } from '@kbn/logs-shared-plugin/common';
import { useCallback } from 'react';
import { useLazyRef } from './use_lazy_ref';
import { useKibanaContextForPlugin } from './use_kibana';

interface Props {
  id: string;
  /**
   * Human readable name of log view.
   * Will be displayed as the page title when navigating to "View in Logs".
   * */
  name: string;
  extraFields?: string[];
}
export const useLogViewReference = ({ id, name, extraFields = [] }: Props) => {
  const {
    services: { logsShared },
  } = useKibanaContextForPlugin();

  const { loading, value: defaultLogView } = useAsync(
    () => logsShared.logViews.client.getLogView(DEFAULT_LOG_VIEW),
    []
  );

  const logViewReference = useLazyRef<LogViewReference | null>(() => {
    return !defaultLogView
      ? null
      : {
          type: 'log-view-inline',
          id,
          attributes: {
            name,
            description: '',
            logIndices: defaultLogView.attributes.logIndices,
            logColumns: [
              {
                timestampColumn: {
                  id: '5e7f964a-be8a-40d8-88d2-fbcfbdca0e2f',
                },
              },
              ...extraFields.map((fieldName) => ({
                fieldColumn: {
                  id: uuidv4(),
                  field: fieldName,
                },
              })),
              {
                messageColumn: {
                  id: 'b645d6da-824b-4723-9a2a-e8cece1645c0',
                },
              },
            ],
          },
        };
  });

  const getLogsDataView = useCallback(
    async (reference?: LogViewReference | null) => {
      if (reference) {
        const resolvedLogview = await logsShared.logViews.client.getResolvedLogView(reference);

        return resolvedLogview.dataViewReference;
      }
    },
    [logsShared.logViews.client]
  );

  return { logViewReference: logViewReference.current, loading, getLogsDataView };
};
