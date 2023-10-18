/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { ConnectorTypes } from '../../../common';
import * as i18n from './translations';
import { getCaseConfigure } from './api';
import type { ServerError } from '../../types';
import { casesQueriesKeys } from '../constants';
import type { CasesConfigurationUI } from '../types';
import { useCasesToast } from '../../common/use_cases_toast';
import { useCasesContext } from '../../components/cases_context/use_cases_context';

const initialConfiguration: CasesConfigurationUI = {
  closureType: 'close-by-user',
  connector: {
    fields: null,
    id: 'none',
    name: 'none',
    type: ConnectorTypes.none,
  },
  customFields: [],
  mappings: [],
  version: '',
  id: '',
};

const transformConfiguration = (data: CasesConfigurationUI | null): CasesConfigurationUI => {
  if (data) {
    return data;
  }

  return initialConfiguration;
};

export const useGetCaseConfiguration = () => {
  const { owner } = useCasesContext();
  const { showErrorToast } = useCasesToast();

  return useQuery<CasesConfigurationUI | null, ServerError, CasesConfigurationUI>(
    casesQueriesKeys.configuration(),
    ({ signal }) => getCaseConfigure({ owner, signal }),
    {
      select: transformConfiguration,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
      initialData: initialConfiguration,
    }
  );
};

export type UseGetCaseConfiguration = ReturnType<typeof useGetCaseConfiguration>;
