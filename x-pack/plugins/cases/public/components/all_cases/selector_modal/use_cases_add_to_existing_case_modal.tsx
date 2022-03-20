/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { AllCasesSelectorModalProps } from '.';
import { useCasesToast } from '../../../common/use_cases_toast';
import { Case } from '../../../containers/types';
import { CasesContextStoreActionsList } from '../../cases_context/cases_context_reducer';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesAddToNewCaseFlyout } from '../../create/flyout/use_cases_add_to_new_case_flyout';

export const useCasesAddToExistingCaseModal = (props: AllCasesSelectorModalProps) => {
  const createNewCaseFlyout = useCasesAddToNewCaseFlyout({
    attachments: props.attachments,
    onClose: props.onClose,
    // TODO there's no need for onSuccess to be async. This will be fixed
    // in a follow up clean up
    onSuccess: async (theCase?: Case) => {
      if (props.onRowClick) {
        return props.onRowClick(theCase);
      }
    },
  });
  const { dispatch } = useCasesContext();
  const casesToasts = useCasesToast();

  const closeModal = useCallback(() => {
    dispatch({
      type: CasesContextStoreActionsList.CLOSE_ADD_TO_CASE_MODAL,
    });
    // in case the flyout was also open when selecting
    // create a new case
    dispatch({
      type: CasesContextStoreActionsList.CLOSE_CREATE_CASE_FLYOUT,
    });
  }, [dispatch]);

  const openModal = useCallback(() => {
    dispatch({
      type: CasesContextStoreActionsList.OPEN_ADD_TO_CASE_MODAL,
      payload: {
        ...props,
        onRowClick: (theCase?: Case) => {
          // when the case is undefined in the modal
          // the user clicked "create new case"
          if (theCase === undefined) {
            closeModal();
            createNewCaseFlyout.open();
          } else {
            casesToasts.showSuccessAttach(theCase);
            if (props.onRowClick) {
              props.onRowClick(theCase);
            }
          }
        },
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
  }, [casesToasts, closeModal, createNewCaseFlyout, dispatch, props]);
  return {
    open: openModal,
    close: closeModal,
  };
};
export type UseCasesAddToExistingCaseModal = typeof useCasesAddToExistingCaseModal;
