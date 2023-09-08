/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import * as i18n from '../translations';
import { fetchActionTypes } from './api';
import { useToasts } from '../../common/lib/kibana';
import { casesQueriesKeys } from '../constants';
import type { ServerError } from '../../types';

export const useGetActionTypes = () => {
  const toasts = useToasts();
  return useQuery(casesQueriesKeys.connectorTypes(), ({ signal }) => fetchActionTypes({ signal }), {
    initialData: [],
    onError: (error: ServerError) => {
      toasts.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
        title: i18n.ERROR_TITLE,
      });
    },
  });
};
