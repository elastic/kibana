/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_LOG_VIEW, LogViewReference } from '../../../../../common/log_views';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';

interface Props {
  extraFields?: string[];
}
export const useLogViewReference = (props?: Props) => {
  const { extraFields = [] } = props ?? {};
  const {
    services: {
      logViews: { client },
    },
  } = useKibanaContextForPlugin();

  const { loading, value: defaultLogView } = useAsync(() => client.getLogView(DEFAULT_LOG_VIEW));

  const logViewReference: LogViewReference | null = useMemo(() => {
    return defaultLogView
      ? {
          type: 'log-view-inline',
          id: 'hosts-logs-view',
          attributes: {
            name: 'Hosts Logs View',
            description: 'Default view for hosts logs tab',
            logIndices: defaultLogView.attributes.logIndices,
            logColumns: [
              {
                timestampColumn: {
                  id: '5e7f964a-be8a-40d8-88d2-fbcfbdca0e2f',
                },
              },
              {
                messageColumn: {
                  id: 'b645d6da-824b-4723-9a2a-e8cece1645c0',
                },
              },
              ...extraFields.map((fieldName) => ({
                fieldColumn: {
                  id: uuidv4(),
                  field: fieldName,
                },
              })),
            ],
          },
        }
      : null;
  }, [extraFields, defaultLogView]);

  return { logViewReference, loading };
};
