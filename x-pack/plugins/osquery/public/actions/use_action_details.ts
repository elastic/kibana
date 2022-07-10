/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import type { ESTermQuery } from '../../common/typed_json';
import { useErrorToast } from '../common/hooks/use_error_toast';

export interface ActionDetailsArgs {
  actionDetails: Record<string, string>;
  id: string;
}

interface UseActionDetails {
  actionId: string;
  isLive?: boolean;
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
}

export const useActionDetails = ({
  actionId,
  filterQuery,
  isLive = false,
  skip = false,
}: UseActionDetails) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery(
    ['actionDetails', { actionId, filterQuery }],
    () => http.get(`/api/osquery/live_queries/${actionId}`),
    {
      enabled: !skip,
      refetchInterval: isLive ? 5000 : false,
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.action_details.fetchError', {
            defaultMessage: 'Error while fetching action details',
          }),
        }),
      refetchOnWindowFocus: false,
      retryDelay: 5000,
    }
  );
};
