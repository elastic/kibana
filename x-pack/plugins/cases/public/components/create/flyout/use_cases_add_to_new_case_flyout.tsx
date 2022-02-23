/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { CasesContextStoreActionsList } from '../../cases_context/cases_context_reducer';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { CreateCaseFlyoutProps } from './create_case_flyout';

export const useCasesAddToNewCaseFlyout = (props: CreateCaseFlyoutProps) => {
  const context = useCasesContext();

  const closeFlyout = useCallback(() => {
    context.dispatch({
      type: CasesContextStoreActionsList.CLOSE_CREATE_CASE_FLYOUT,
    });
  }, [context]);

  const openFlyout = useCallback(() => {
    context.dispatch({
      type: CasesContextStoreActionsList.OPEN_CREATE_CASE_FLYOUT,
      payload: {
        ...props,
        onClose: () => {
          closeFlyout();
          if (props.onClose) {
            return props.onClose();
          }
        },
        afterCaseCreated: async (...args) => {
          closeFlyout();
          if (props.afterCaseCreated) {
            return props.afterCaseCreated(...args);
          }
        },
      },
    });
  }, [closeFlyout, context, props]);
  return {
    open: openFlyout,
    close: closeFlyout,
  };
};

export type UseCasesAddToNewCaseFlyout = typeof useCasesAddToNewCaseFlyout;
