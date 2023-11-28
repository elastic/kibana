/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { CaseStatuses } from '../../../../common/types/domain';
import type { AllCasesSelectorModalProps } from '.';
import { useCasesToast } from '../../../common/use_cases_toast';
import type { CaseUI } from '../../../containers/types';
import { StatusAll } from '../../../containers/types';
import { CasesContextStoreActionsList } from '../../cases_context/cases_context_reducer';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesAddToNewCaseFlyout } from '../../create/flyout/use_cases_add_to_new_case_flyout';
import type { CaseAttachmentsWithoutOwner } from '../../../types';
import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { useAddAttachmentToExistingCaseTransaction } from '../../../common/apm/use_cases_transactions';
import { NO_ATTACHMENTS_ADDED } from '../translations';

export type AddToExistingCaseModalProps = Omit<AllCasesSelectorModalProps, 'onRowClick'> & {
  successToaster?: {
    title?: string;
    content?: string;
  };
  noAttachmentsToaster?: {
    title?: string;
    content?: string;
  };
  onSuccess?: (theCase: CaseUI) => void;
};

export const useCasesAddToExistingCaseModal = (props: AddToExistingCaseModalProps = {}) => {
  const createNewCaseFlyout = useCasesAddToNewCaseFlyout({
    onClose: props.onClose,
    onSuccess: (theCase?: CaseUI) => {
      if (props.onSuccess && theCase) {
        return props.onSuccess(theCase);
      }
    },
    toastTitle: props.successToaster?.title,
    toastContent: props.successToaster?.content,
  });

  const { dispatch, appId } = useCasesContext();
  const casesToasts = useCasesToast();
  const { mutateAsync: createAttachments } = useCreateAttachments();
  const { startTransaction } = useAddAttachmentToExistingCaseTransaction();

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
    async (
      theCase: CaseUI | undefined,
      getAttachments?: ({ theCase }: { theCase?: CaseUI }) => CaseAttachmentsWithoutOwner
    ) => {
      const attachments = getAttachments?.({ theCase }) ?? [];

      // when the case is undefined in the modal
      // the user clicked "create new case"
      if (theCase === undefined) {
        closeModal();
        createNewCaseFlyout.open({ attachments });
        return;
      }

      try {
        // add attachments to the case
        if (attachments === undefined || attachments.length === 0) {
          const title = props.noAttachmentsToaster?.title ?? NO_ATTACHMENTS_ADDED;
          const content = props.noAttachmentsToaster?.content;
          casesToasts.showInfoToast(title, content);

          return;
        }

        startTransaction({ appId, attachments });

        await createAttachments({
          caseId: theCase.id,
          caseOwner: theCase.owner,
          attachments,
        });

        if (props.onSuccess) {
          props.onSuccess(theCase);
        }

        casesToasts.showSuccessAttach({
          theCase,
          attachments,
          title: props.successToaster?.title,
          content: props.successToaster?.content,
        });
      } catch (error) {
        // error toast is handled
        // inside the createAttachments method
      }
    },
    [
      appId,
      casesToasts,
      closeModal,
      createAttachments,
      createNewCaseFlyout,
      props,
      startTransaction,
    ]
  );

  const openModal = useCallback(
    ({
      getAttachments,
    }: {
      getAttachments?: ({ theCase }: { theCase?: CaseUI }) => CaseAttachmentsWithoutOwner;
    } = {}) => {
      dispatch({
        type: CasesContextStoreActionsList.OPEN_ADD_TO_CASE_MODAL,
        payload: {
          ...props,
          hiddenStatuses: [CaseStatuses.closed, StatusAll],
          onRowClick: (theCase?: CaseUI) => {
            handleOnRowClick(theCase, getAttachments);
          },
          onClose: (theCase?: CaseUI, isCreateCase?: boolean) => {
            closeModal();

            if (props.onClose) {
              return props.onClose(theCase, isCreateCase);
            }
          },
        },
      });
    },
    [closeModal, dispatch, handleOnRowClick, props]
  );

  return {
    open: openModal,
    close: closeModal,
  };
};
export type UseCasesAddToExistingCaseModal = typeof useCasesAddToExistingCaseModal;
