/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import { createFilter } from '../common/helpers';
import { useKibana } from '../common/lib/kibana';
import {
  OsqueryQueries,
  ActionDetailsRequestOptions,
  ActionDetailsStrategyResponse,
} from '../../common/search_strategy';
import { ESTermQuery } from '../../common/typed_json';
import { useErrorToast } from '../common/hooks/use_error_toast';

export interface ActionDetailsArgs {
  actionDetails: Record<string, string>;
  id: string;
}

interface UseActionDetails {
  actionId: string;
  filterQuery?: ESTermQuery | string;
  skip?: boolean;
}

export const useActionDetails = ({ actionId, filterQuery, skip = false }: UseActionDetails) => {
  const { data } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery(
    ['actionDetails', { actionId, filterQuery }],
    async () => {
      const responseData = await lastValueFrom(
        data.search.search<ActionDetailsRequestOptions, ActionDetailsStrategyResponse>(
          {
            actionId,
            factoryQueryType: OsqueryQueries.actionDetails,
            filterQuery: createFilter(filterQuery),
          },
          {
            strategy: 'osquerySearchStrategy',
          }
        )
      );

      if (!responseData.actionDetails) throw new Error();

      return responseData;
    },
    {
      enabled: !skip,
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.action_details.fetchError', {
            defaultMessage: 'Error while fetching action details',
          }),
        }),
      refetchOnWindowFocus: false,
      retryDelay: 1000,
    }
  );
};
