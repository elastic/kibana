/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback } from 'react';
import type { CaseAttachmentsWithoutOwner } from '../../../types';
import { useCasesToast } from '../../../common/use_cases_toast';
import type { Case } from '../../../containers/types';
import { CasesContextStoreActionsList } from '../../cases_context/cases_context_reducer';
import { useCasesContext } from '../../cases_context/use_cases_context';
import type { CreateCaseFlyoutProps } from './create_case_flyout';

type AddToNewCaseFlyoutProps = Omit<CreateCaseFlyoutProps, 'attachments'> & {
  toastTitle?: string;
  toastContent?: string;
};

export const useCasesAddToNewCaseFlyout = (props: AddToNewCaseFlyoutProps = {}) => {
  const { dispatch } = useCasesContext();
  const casesToasts = useCasesToast();

  const closeFlyout = useCallback(() => {
    dispatch({
      type: CasesContextStoreActionsList.CLOSE_CREATE_CASE_FLYOUT,
    });
  }, [dispatch]);

  const openFlyout = useCallback(
    ({
      attachments,
      headerContent,
    }: { attachments?: CaseAttachmentsWithoutOwner; headerContent?: React.ReactNode } = {}) => {
      dispatch({
        type: CasesContextStoreActionsList.OPEN_CREATE_CASE_FLYOUT,
        payload: {
          ...props,
          attachments,
          headerContent,
          onClose: () => {
            closeFlyout();
            if (props.onClose) {
              return props.onClose();
            }
          },
          onSuccess: async (theCase: Case) => {
            if (theCase) {
              casesToasts.showSuccessAttach({
                theCase,
                attachments: attachments ?? [],
                title: props.toastTitle,
                content: props.toastContent,
              });
            }
            if (props.onSuccess) {
              return props.onSuccess(theCase);
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
    },
    [casesToasts, closeFlyout, dispatch, props]
  );
  return {
    open: openFlyout,
    close: closeFlyout,
  };
};

export type UseCasesAddToNewCaseFlyout = typeof useCasesAddToNewCaseFlyout;
