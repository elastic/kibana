/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { createEsParams, useEsSearch } from '../../../../../observability/public';
import { selectDynamicSettings } from '../../../state/selectors';
import { Ping } from '../../../../common/runtime_types';

export const useStdErrorLogs = ({
  configId,
  checkGroup,
}: {
  configId?: string;
  checkGroup?: string;
}) => {
  const { settings } = useSelector(selectDynamicSettings);
  const { data, loading } = useEsSearch(
    createEsParams({
      index: !configId && !checkGroup ? '' : settings?.heartbeatIndices,
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
              ...(configId
                ? [
                    {
                      term: {
                        config_id: configId,
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
