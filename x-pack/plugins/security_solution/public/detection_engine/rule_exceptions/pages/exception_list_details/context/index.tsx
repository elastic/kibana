/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, createContext, useContext, useMemo, useCallback } from 'react';
import type { Dispatch } from 'react';

import type { ExceptionListItemSchema, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import type { Pagination } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core/public';
import type { RuleReferences } from '@kbn/securitysolution-exception-list-components';
import { ViewerStatus } from '@kbn/securitysolution-exception-list-components';
import { useToasts, useKibana } from '../../../../../common/lib/kibana';
import * as i18n from '../translations';

interface ExceptionListDetailsContextProps {
  viewerStatus: string;
  exceptionListReferences: RuleReferences;
  toasts?: IToasts;
  http: HttpSetup | undefined;
  exceptions: ExceptionListItemSchema[];
  isLoading: boolean;
  pagination: Pagination;
  isReadOnly: boolean;
  showAddExceptionFlyout: boolean;
  showEditExceptionFlyout: boolean;
  setIsLoading: Dispatch<React.SetStateAction<boolean>>;
  setExceptions: Dispatch<React.SetStateAction<ExceptionListItemSchema[] | ListArray>>;
  setPagination: Dispatch<React.SetStateAction<Pagination>>;
  setIsReadOnly: Dispatch<React.SetStateAction<boolean>>;
  setShowAddExceptionFlyout: Dispatch<React.SetStateAction<boolean>>;
  setShowEditExceptionFlyout: Dispatch<React.SetStateAction<boolean>>;
  setExceptionListReferences: Dispatch<React.SetStateAction<RuleReferences | null>>;
  setViewerStatus: Dispatch<React.SetStateAction<ViewerStatus | ''>>;
  handleErrorStatus: (error: Error, title?: string, description?: string) => void;
}
const defaultState: ExceptionListDetailsContextProps = {
  viewerStatus: ViewerStatus.LOADING,
  exceptionListReferences: {},
  exceptions: [],
  isLoading: false,
  pagination: { pageIndex: 0, pageSize: 0, totalItemCount: 0 },
  isReadOnly: false,
  showAddExceptionFlyout: false,
  showEditExceptionFlyout: false,
  http: undefined,
  setIsLoading: () => {},
  setExceptions: () => {},
  setPagination: () => null,
  setIsReadOnly: () => {},
  setShowAddExceptionFlyout: () => {},
  setShowEditExceptionFlyout: () => {},
  setExceptionListReferences: () => {},
  setViewerStatus: () => {},
  handleErrorStatus: (error, title, description) => {},
};

const ExceptionListDetailsContext = createContext<ExceptionListDetailsContextProps>(defaultState);

interface ExceptionListDetailsProvidersProps {
  children: React.ReactNode;
}

export const ExceptionListDetailsProvider = ({ children }: ExceptionListDetailsProvidersProps) => {
  const toasts = useToasts();
  const { services } = useKibana();
  const { http } = services;

  const [viewerStatus, setViewerStatus] = useState<ViewerStatus | string>(
    defaultState.viewerStatus
  );

  const [isLoading, setIsLoading] = useState(defaultState.isLoading);
  const [exceptions, setExceptions] = useState(defaultState.exceptions);
  const [exceptionListReferences, setExceptionListReferences] = useState(
    defaultState.exceptionListReferences
  );
  const [pagination, setPagination] = useState(defaultState.pagination);
  const [isReadOnly, setIsReadOnly] = useState(defaultState.isReadOnly);
  const [showAddExceptionFlyout, setShowAddExceptionFlyout] = useState(false);
  const [showEditExceptionFlyout, setShowEditExceptionFlyout] = useState(false);

  const handleErrorStatus = useCallback(
    (error: Error, errorTitle?: string, errorDescription?: string) => {
      toasts?.addError(error, {
        title: errorTitle || i18n.EXCEPTION_ERROR_TITLE,
        toastMessage: errorDescription || i18n.EXCEPTION_ERROR_DESCRIPTION,
      });
      setViewerStatus(ViewerStatus.ERROR);
    },
    [setViewerStatus, toasts]
  );
  const providerValue = useMemo(
    () => ({
      http,
      viewerStatus,
      isLoading,
      pagination,
      exceptions,
      isReadOnly,
      showAddExceptionFlyout,
      showEditExceptionFlyout,
      toasts,
      exceptionListReferences,
      setViewerStatus,
      setExceptions,
      setPagination,
      setIsLoading,
      setIsReadOnly,
      setExceptionListReferences,
      handleErrorStatus,
      setShowAddExceptionFlyout,
      setShowEditExceptionFlyout,
    }),
    [
      http,
      viewerStatus,
      isLoading,
      pagination,
      exceptions,
      isReadOnly,
      showAddExceptionFlyout,
      showEditExceptionFlyout,
      toasts,
      exceptionListReferences,
      handleErrorStatus,
    ]
  );

  return (
    <ExceptionListDetailsContext.Provider value={providerValue as ExceptionListDetailsContextProps}>
      {children}
    </ExceptionListDetailsContext.Provider>
  );
};

export const useExceptionListDetailsContext = () => {
  const exceptionListDetailsContext = useContext(ExceptionListDetailsContext);

  return exceptionListDetailsContext;
};
