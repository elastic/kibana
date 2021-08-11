/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';

export const useActionResultsPrivileges = () => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery(
    ['actionResultsPrivileges'],
    () => http.get('/internal/osquery/privileges_check'),
    {
      keepPreviousData: true,
      select: (response) => response?.has_all_requested ?? false,
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.action_results_privileges.fetchError', {
            defaultMessage: 'Error while fetching action results privileges',
          }),
        }),
    }
  );
};
