/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesContextStoreActionsList } from '../../cases_context/cases_context_reducer';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { CreateCaseFlyoutProps } from './create_case_flyout';

export const useCasesAddToNewCasesFlyout = () => {
  const context = useCasesContext();
  return {
    open: (props: CreateCaseFlyoutProps) => {
      context.dispatch({
        type: CasesContextStoreActionsList.OPEN_CREATE_CASE_FLYOUT,
        payload: props,
      });
    },
  };
};

export type UseCasesAddToNewCasesFlyout = typeof useCasesAddToNewCasesFlyout;
