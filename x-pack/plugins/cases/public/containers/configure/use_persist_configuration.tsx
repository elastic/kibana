/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isEmpty } from 'lodash';
import { postCaseConfigure, patchCaseConfigure } from './api';
import * as i18n from './translations';
import type { ServerError } from '../../types';
import { useCasesToast } from '../../common/use_cases_toast';
import { casesMutationsKeys, casesQueriesKeys } from '../constants';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import type { SnakeToCamelCase } from '../../../common/types';
import type { ConfigurationRequest } from '../../../common/types/api';

type Request = Omit<SnakeToCamelCase<ConfigurationRequest>, 'owner'> & {
  id: string;
  version: string;
};

export const usePersistConfiguration = () => {
  const queryClient = useQueryClient();
  const { owner } = useCasesContext();
  const { showErrorToast, showSuccessToast } = useCasesToast();

  return useMutation(
    ({ id, version, closureType, customFields, connector }: Request) => {
      if (isEmpty(id) || isEmpty(version)) {
        return postCaseConfigure({
          closure_type: closureType,
          connector,
          customFields: customFields ?? [],
          owner: owner[0],
        });
      }

      return patchCaseConfigure(id, {
        version,
        closure_type: closureType,
        connector,
        customFields: customFields ?? [],
      });
    },
    {
      mutationKey: casesMutationsKeys.persistCaseConfiguration,
      onSuccess: () => {
        queryClient.invalidateQueries(casesQueriesKeys.configuration({}));
        showSuccessToast(i18n.SUCCESS_CONFIGURE);
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UsePersistConfiguration = ReturnType<typeof usePersistConfiguration>;
