/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import * as i18n from './translations';
import { getCaseConfigure } from './api';
import type { ServerError } from '../../types';
import { casesQueriesKeys } from '../constants';
import type { CasesConfigurationUI } from '../types';
import { useCasesToast } from '../../common/use_cases_toast';
import { initialConfiguration } from './utils';

export const useGetCaseConfigurationsQuery = <T,>({
  select,
}: {
  select: (data: CasesConfigurationUI[] | null) => T;
}) => {
  const { showErrorToast } = useCasesToast();

  return useQuery<CasesConfigurationUI[] | null, ServerError, T>(
    casesQueriesKeys.configuration({}),
    ({ signal }) => getCaseConfigure({ signal }),
    {
      select,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
      initialData: [initialConfiguration],
    }
  );
};

export type UseGetAllCaseConfigurations = ReturnType<typeof useGetCaseConfigurationsQuery>;
