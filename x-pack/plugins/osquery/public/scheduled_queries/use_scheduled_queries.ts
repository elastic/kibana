/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { produce } from 'immer';
import { useQuery } from 'react-query';

import { useKibana } from '../common/lib/kibana';
import { PACKAGE_POLICY_API_ROUTES, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../fleet/common';
import { OSQUERY_INTEGRATION_NAME } from '../../common';

export const useScheduledQueries = () => {
  const { http } = useKibana().services;

  return useQuery(
    ['scheduledQueries'],
    () =>
      http.get(PACKAGE_POLICY_API_ROUTES.LIST_PATTERN, {
        query: {
          page: 1,
          perPage: 10000,
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: ${OSQUERY_INTEGRATION_NAME}`,
        },
      }),
    {
      keepPreviousData: true,
      select: produce((draft) => {
        draft.items = draft.items.filter(
          (item) =>
            !(
              !item.inputs[0].streams.length ||
              (item.inputs[0].streams.length === 1 &&
                !item.inputs[0].streams[0].compiled_stream.query)
            )
        );
      }),
    }
  );
};
