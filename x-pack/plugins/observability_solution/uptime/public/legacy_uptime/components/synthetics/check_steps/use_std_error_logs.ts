/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEsParams, useEsSearch } from '@kbn/observability-shared-plugin/public';
import { useSelector } from 'react-redux';
import { Ping } from '../../../../../common/runtime_types';
import { selectDynamicSettings } from '../../../state/selectors';

export const useStdErrorLogs = ({
  monitorId,
  checkGroup,
}: {
  monitorId?: string;
  checkGroup?: string;
}) => {
  const { settings } = useSelector(selectDynamicSettings);
  const { data, loading } = useEsSearch(
    createEsParams({
      index: !monitorId && !checkGroup ? '' : settings?.heartbeatIndices,
      body: {
        size: 1000,
        query: {
          bool: {
            filter: [
              {
                term: {
                  'synthetics.type': 'stderr',
                },
              },
              ...(monitorId
                ? [
                    {
                      term: {
                        'monitor.id': monitorId,
                      },
                    },
                  ]
                : []),
              ...(checkGroup
                ? [
                    {
                      term: {
                        'monitor.check_group': checkGroup,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
      },
    }),
    [settings?.heartbeatIndices],
    { name: 'getStdErrLogs' }
  );

  return {
    items: data?.hits.hits.map((hit) => ({ ...(hit._source as Ping), id: hit._id })) ?? [],
    loading,
  };
};
