/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { HttpSetup } from '@kbn/core/public';
import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { isEmpty } from 'lodash';
import type { ServerError } from '../../../types';
import { useCasesToast } from '../../../common/use_cases_toast';
import type { ActionConnector } from '../../../../common/api';
import { getFieldsByIssueType } from './api';
import type { Fields } from './types';
import * as i18n from './translations';
import { connectorsQueriesKeys } from '../constants';

interface Props {
  http: HttpSetup;
  issueType: string | null;
  connector?: ActionConnector;
}

export const useGetFieldsByIssueType = ({ http, connector, issueType }: Props) => {
  const { showErrorToast } = useCasesToast();
  return useQuery<ActionTypeExecutorResult<Fields>, ServerError>(
    connectorsQueriesKeys.jiraGetFieldsByIssueType(connector?.id ?? '', issueType ?? ''),
    () => {
      const abortCtrlRef = new AbortController();
      return getFieldsByIssueType({
        http,
        signal: abortCtrlRef.signal,
        connectorId: connector?.id ?? '',
        id: issueType ?? '',
      });
    },
    {
      enabled: Boolean(connector) && !isEmpty(issueType),
      staleTime: 60 * 1000, // one minute
      onSuccess: (res) => {
        if (res.status && res.status === 'error') {
          showErrorToast(new Error(i18n.FIELDS_API_ERROR), {
            title: i18n.FIELDS_API_ERROR,
            toastMessage: `${res.serviceMessage ?? res.message}`,
          });
        }
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.FIELDS_API_ERROR });
      },
    }
  );
};

export type UseGetFieldsByIssueType = ReturnType<typeof useGetFieldsByIssueType>;
