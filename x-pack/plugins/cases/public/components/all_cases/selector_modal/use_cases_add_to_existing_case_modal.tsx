/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { CaseStatuses, StatusAll } from '../../../../common';
import { AllCasesSelectorModalProps } from '.';
import { useCasesToast } from '../../../common/use_cases_toast';
import { Case } from '../../../containers/types';
import { CasesContextStoreActionsList } from '../../cases_context/cases_context_reducer';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesAddToNewCaseFlyout } from '../../create/flyout/use_cases_add_to_new_case_flyout';
import { CaseAttachments } from '../../../types';
import { usePostComment } from '../../../containers/use_post_comment';

type AddToExistingFlyoutProps = AllCasesSelectorModalProps & {
  toastTitle?: string;
  toastContent?: string;
  attachments?: CaseAttachments;
};

export const useCasesAddToExistingCaseModal = (props: AddToExistingFlyoutProps) => {
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
    toastTitle: props.toastTitle,
    toastContent: props.toastContent,
  });

  const { dispatch } = useCasesContext();
  const casesToasts = useCasesToast();
  const { postComment } = usePostComment();

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

  const handleOnRowClick = useCallback(
    async (theCase?: Case) => {
      // when the case is undefined in the modal
      // the user clicked "create new case"
      if (theCase === undefined) {
        closeModal();
        createNewCaseFlyout.open();
        return;
      }

      try {
        // add attachments to the case
        const attachments = props.attachments;
        if (attachments !== undefined && attachments.length > 0) {
          for (const attachment of attachments) {
            await postComment({
              caseId: theCase.id,
              data: attachment,
              throwOnError: true,
            });
          }
        }

        casesToasts.showSuccessAttach({
          theCase,
          attachments: props.attachments,
          title: props.toastTitle,
          content: props.toastContent,
        });
      } catch (error) {
        // error toast is handled
        // inside the postComment method
      }

      if (props.onRowClick) {
        props.onRowClick(theCase);
      }
    },
    [casesToasts, closeModal, createNewCaseFlyout, postComment, props]
  );

  const openModal = useCallback(() => {
    dispatch({
      type: CasesContextStoreActionsList.OPEN_ADD_TO_CASE_MODAL,
      payload: {
        ...props,
        hiddenStatuses: [CaseStatuses.closed, StatusAll],
        onRowClick: handleOnRowClick,
        onClose: () => {
          closeModal();
          if (props.onClose) {
            return props.onClose();
          }
        },
      },
    });
  }, [closeModal, dispatch, handleOnRowClick, props]);
  return {
    open: openModal,
    close: closeModal,
  };
};
export type UseCasesAddToExistingCaseModal = typeof useCasesAddToExistingCaseModal;
