/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';
import { HttpSetup, ToastsApi, ApplicationStart, DocLinksStart } from 'kibana/public';
import { ActionTypeModel } from '../../types';
import { TypeRegistry } from '../type_registry';

export interface ActionsConnectorsContextValue {
  http: HttpSetup;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  capabilities: ApplicationStart['capabilities'];
  reloadConnectors?: () => Promise<void>;
  docLinks: DocLinksStart;
  consumer?: string;
}

const ActionsConnectorsContext = createContext<ActionsConnectorsContextValue>(null as any);

export const ActionsConnectorsContextProvider = ({
  children,
  value,
}: {
  value: ActionsConnectorsContextValue;
  children: React.ReactNode;
}) => {
  return (
    <ActionsConnectorsContext.Provider value={value}>{children}</ActionsConnectorsContext.Provider>
  );
};

export const useActionsConnectorsContext = () => {
  const ctx = useContext(ActionsConnectorsContext);
  if (!ctx) {
    throw new Error('ActionsConnectorsContext has not been set.');
  }
  return ctx;
};
