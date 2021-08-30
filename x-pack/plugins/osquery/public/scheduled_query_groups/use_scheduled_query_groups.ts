/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { produce } from 'immer';
import { useQuery } from 'react-query';

import { useKibana } from '../common/lib/kibana';
import { ListResult, PackagePolicy, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../fleet/common';
import { OSQUERY_INTEGRATION_NAME } from '../../common';

export const useScheduledQueryGroups = () => {
  const { http } = useKibana().services;

  return useQuery<ListResult<PackagePolicy>>(
    ['scheduledQueries'],
    () =>
      http.get('/internal/osquery/scheduled_query_group', {
        query: {
          page: 1,
          perPage: 10000,
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: ${OSQUERY_INTEGRATION_NAME}`,
        },
      }),
    {
      keepPreviousData: true,
      select: produce((draft: ListResult<PackagePolicy>) => {
        draft.items = draft.items.filter(
          (item) =>
            !(
              item.inputs[0].streams.length === 1 &&
              !item.inputs[0].streams[0].compiled_stream.query
            )
        );
      }),
    }
  );
};
