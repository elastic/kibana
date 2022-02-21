/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { AllCasesSelectorModalProps } from '.';
import { CasesContextStoreActionsList } from '../../cases_context/cases_context_reducer';
import { useCasesContext } from '../../cases_context/use_cases_context';

export const useCasesAddToExistingCaseModal = (props: AllCasesSelectorModalProps) => {
  const context = useCasesContext();
  const closeModal = useCallback(() => {
    context.dispatch({
      type: CasesContextStoreActionsList.CLOSE_ADD_TO_CASE_MODAL,
    });
  }, [context]);

  const openModal = useCallback(() => {
    context.dispatch({
      type: CasesContextStoreActionsList.OPEN_ADD_TO_CASE_MODAL,
      payload: {
        ...props,
        onClose: () => {
          closeModal();
          if (props.onClose) {
            return props.onClose();
          }
        },
        updateCase: async (...args) => {
          closeModal();
          if (props.updateCase) {
            return props.updateCase(...args);
          }
        },
      },
    });
  }, [closeModal, context, props]);
  return {
    open: openModal,
    close: closeModal,
  };
};
export type UseCasesAddToExistingCaseModal = typeof useCasesAddToExistingCaseModal;
