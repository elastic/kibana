/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateCaseFormProps } from '../create/form';

export const initialCasesContextState: CasesContextState = {
  casesFlyout: {
    isFlyoutOpen: false,
  },
};

export interface CasesContextState {
  casesFlyout: {
    isFlyoutOpen: boolean;
    props?: CreateCaseFormProps;
  };
}

export enum CasesContextStoreActionsList {
  OPEN_CREATE_CASE_FLYOUT,
  CLOSE_CREATE_CASE_FLYOUT,
}
export type CasesContextStoreAction =
  | {
      type: CasesContextStoreActionsList.OPEN_CREATE_CASE_FLYOUT;
      payload: CreateCaseFormProps;
    }
  | { type: CasesContextStoreActionsList.CLOSE_CREATE_CASE_FLYOUT };

export const casesContextReducer: React.Reducer<CasesContextState, CasesContextStoreAction> = (
  state: CasesContextState,
  action: CasesContextStoreAction
): CasesContextState => {
  console.log('I got this action', action);
  console.log('the current state', state);
  switch (action.type) {
    case CasesContextStoreActionsList.OPEN_CREATE_CASE_FLYOUT: {
      return {
        ...state,
        casesFlyout: {
          isFlyoutOpen: true,
          props: action.payload,
        },
      };
    }
  }
  return state;
};
