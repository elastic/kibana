/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiGlobalToastListToast as Toast } from '@elastic/eui';
import { EuiButton, EuiGlobalToastList } from '@elastic/eui';
import { noop } from 'lodash/fp';
import type { Dispatch } from 'react';
import React, { createContext, useContext, useReducer, useState } from 'react';
import styled from 'styled-components';

import { ModalAllErrors } from './modal_all_errors';
import * as i18n from './translations';

export * from './utils';
export * from './errors';

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
export interface AppToast extends Toast {
  // FunFact: In a very rare case of errors this can be something other than array. We have a unit test case for it and am leaving it like this type for now.
  errors?: string[];
}

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
interface ToastState {
  toasts: AppToast[];
}

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
const initialToasterState: ToastState = {
  toasts: [],
};

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
export type ActionToaster =
  | { type: 'addToaster'; toast: AppToast }
  | { type: 'deleteToaster'; id: string }
  | { type: 'toggleWaitToShowNextToast' };

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
export const StateToasterContext = createContext<[ToastState, Dispatch<ActionToaster>]>([
  initialToasterState,
  () => noop,
]);

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
export const useStateToaster = () => useContext(StateToasterContext);

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
interface ManageGlobalToasterProps {
  children: React.ReactNode;
}

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
export const ManageGlobalToaster = ({ children }: ManageGlobalToasterProps) => {
  const reducerToaster = (state: ToastState, action: ActionToaster) => {
    switch (action.type) {
      case 'addToaster':
        return { ...state, toasts: [...state.toasts, action.toast] };
      case 'deleteToaster':
        return { ...state, toasts: state.toasts.filter((msg) => msg.id !== action.id) };
      default:
        return state;
    }
  };

  return (
    <StateToasterContext.Provider value={useReducer(reducerToaster, initialToasterState)}>
      {children}
    </StateToasterContext.Provider>
  );
};

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
const GlobalToasterListContainer = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
`;

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
interface GlobalToasterProps {
  toastLifeTimeMs?: number;
}

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
export const GlobalToaster = ({ toastLifeTimeMs = 5000 }: GlobalToasterProps) => {
  const [{ toasts }, dispatch] = useStateToaster();
  const [isShowing, setIsShowing] = useState(false);
  const [toastInModal, setToastInModal] = useState<AppToast | null>(null);

  const toggle = (toast: AppToast) => {
    if (isShowing) {
      dispatch({ type: 'deleteToaster', id: toast.id });
      setToastInModal(null);
    } else {
      setToastInModal(toast);
    }
    setIsShowing(!isShowing);
  };

  return (
    <>
      {toasts.length > 0 && !isShowing && (
        <GlobalToasterListContainer>
          <EuiGlobalToastList
            toasts={[formatToErrorToastIfNeeded(toasts[0], toggle)]}
            dismissToast={({ id }) => {
              dispatch({ type: 'deleteToaster', id });
            }}
            toastLifeTimeMs={toastLifeTimeMs}
          />
        </GlobalToasterListContainer>
      )}
      {toastInModal != null && (
        <ModalAllErrors isShowing={isShowing} toast={toastInModal} toggle={toggle} />
      )}
    </>
  );
};

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
const formatToErrorToastIfNeeded = (
  toast: AppToast,
  toggle: (toast: AppToast) => void
): AppToast => {
  if (toast != null && toast.errors != null && toast.errors.length > 0) {
    toast.text = (
      <ErrorToastContainer>
        <EuiButton
          data-test-subj="toaster-show-all-error-modal"
          size="s"
          color="danger"
          onClick={() => toast != null && toggle(toast)}
        >
          {i18n.SEE_ALL_ERRORS}
        </EuiButton>
      </ErrorToastContainer>
    );
  }
  return toast;
};

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
const ErrorToastContainer = styled.div`
  text-align: right;
`;

/**
 * @deprecated Use x-pack/plugins/security_solution/public/common/hooks/use_app_toasts.ts instead
 */
ErrorToastContainer.displayName = 'ErrorToastContainer';
