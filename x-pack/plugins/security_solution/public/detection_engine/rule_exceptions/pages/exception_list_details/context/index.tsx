/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, createContext, useContext, useMemo } from 'react';
import type { Dispatch } from 'react';

import type { ExceptionListItemSchema, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import type { Pagination } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core/public';
import type { RuleReferences } from '@kbn/securitysolution-exception-list-components';
import { useToasts, useKibana } from '../../../../../common/lib/kibana';

interface ExceptionListDetailsContextProps {
  exceptionListReferences: RuleReferences;
  toasts?: IToasts;
  http: HttpSetup | undefined;
  exceptions: ExceptionListItemSchema[];
  isLoading: boolean;
  pagination: Pagination;
  isReadOnly: boolean;
  setIsLoading: Dispatch<React.SetStateAction<boolean>>;
  setExceptions: Dispatch<React.SetStateAction<ExceptionListItemSchema[] | ListArray>>;
  setPagination: Dispatch<React.SetStateAction<Pagination>>;
  setIsReadOnly: Dispatch<React.SetStateAction<boolean>>;
  setExceptionListReferences: Dispatch<React.SetStateAction<RuleReferences | null>>;
}
const defaultState: ExceptionListDetailsContextProps = {
  exceptionListReferences: {},
  exceptions: [],
  isLoading: false,
  pagination: { pageIndex: 0, pageSize: 0, totalItemCount: 0 },
  isReadOnly: false,
  http: undefined,
  setIsLoading: () => {},
  setExceptions: () => {},
  setPagination: () => null,
  setIsReadOnly: () => {},
  setExceptionListReferences: () => {},
};

const ExceptionListDetailsContext = createContext<ExceptionListDetailsContextProps>(defaultState);

interface ExceptionListDetailsProvidersProps {
  children: React.ReactNode;
}

export const ExceptionListDetailsProvider = ({ children }: ExceptionListDetailsProvidersProps) => {
  const toasts = useToasts();
  const { services } = useKibana();
  const { http } = services;

  const [isLoading, setIsLoading] = useState(false);
  const [exceptions, setExceptions] = useState([]);
  const [exceptionListReferences, setExceptionListReferences] = useState([]);
  const [pagination, setPagination] = useState({});
  const [isReadOnly, setIsReadOnly] = useState(false);

  const providerValue = useMemo(
    () => ({
      http,
      isLoading,
      pagination,
      exceptions,
      isReadOnly,
      toasts,
      exceptionListReferences,

      setExceptions,
      setPagination,
      setIsLoading,
      setIsReadOnly,
      setExceptionListReferences,
    }),
    [exceptionListReferences, exceptions, http, isLoading, isReadOnly, pagination, toasts]
  );

  return (
    <ExceptionListDetailsContext.Provider
      value={providerValue as unknown as ExceptionListDetailsContextProps}
    >
      {children}
    </ExceptionListDetailsContext.Provider>
  );
};

export const useExceptionListDetailsContext = () => {
  const exceptionListDetailsContext = useContext(ExceptionListDetailsContext);

  return exceptionListDetailsContext;
};
