/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { DETECTION_ENGINE_RULES_BULK_GET_SOURCES } from '../../../../../common/constants';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { QueryOrIds } from '../api';
import { bulkGetRulesSources } from '../api';

import * as i18n from './translations';

export const useBulkGetRulesSources = (queryArgs: QueryOrIds) => {
  const { addError } = useAppToasts();

  return useQuery(
    ['POST', DETECTION_ENGINE_RULES_BULK_GET_SOURCES],
    ({ signal }) => bulkGetRulesSources(queryArgs, signal),
    {
      refetchOnWindowFocus: false,
      onError: (error) => {
        addError(error, {
          title: i18n.RULES_SOURCES_FETCH_ERROR,
        });
      },
    }
  );
};
