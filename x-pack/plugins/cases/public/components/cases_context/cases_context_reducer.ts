/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateCaseFlyoutProps } from '../create/flyout';

export const getInitialCasesContextState = (): CasesContextState => {
  return {
    createCaseFlyout: {
      isFlyoutOpen: false,
    },
  };
};

export interface CasesContextState {
  createCaseFlyout: {
    isFlyoutOpen: boolean;
    props?: CreateCaseFlyoutProps;
  };
}

export enum CasesContextStoreActionsList {
  OPEN_CREATE_CASE_FLYOUT,
  CLOSE_CREATE_CASE_FLYOUT,
}
export type CasesContextStoreAction =
  | {
      type: CasesContextStoreActionsList.OPEN_CREATE_CASE_FLYOUT;
      payload: CreateCaseFlyoutProps;
    }
  | { type: CasesContextStoreActionsList.CLOSE_CREATE_CASE_FLYOUT };

export const casesContextReducer: React.Reducer<CasesContextState, CasesContextStoreAction> = (
  state: CasesContextState,
  action: CasesContextStoreAction
): CasesContextState => {
  switch (action.type) {
    case CasesContextStoreActionsList.OPEN_CREATE_CASE_FLYOUT: {
      return { ...state, createCaseFlyout: { isFlyoutOpen: true, props: action.payload } };
    }
    case CasesContextStoreActionsList.CLOSE_CREATE_CASE_FLYOUT: {
      return { ...state, createCaseFlyout: { isFlyoutOpen: false } };
    }
    default:
      return state;
  }
};
