/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, createContext } from 'react';
import { HttpSetup, IUiSettingsClient, ToastsApi, DocLinksStart } from 'kibana/public';
import { ChartsPluginSetup } from 'src/plugins/charts/public';
import { FieldFormatsRegistry } from 'src/plugins/data/common/field_formats';
import { TypeRegistry } from '../type_registry';
import { AlertTypeModel, ActionTypeModel } from '../../types';

export interface AlertsContextValue<MetaData = Record<string, any>> {
  reloadAlerts?: () => Promise<void>;
  http: HttpSetup;
  alertTypeRegistry: TypeRegistry<AlertTypeModel>;
  actionTypeRegistry: TypeRegistry<ActionTypeModel>;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  uiSettings?: IUiSettingsClient;
  charts?: ChartsPluginSetup;
  dataFieldsFormats?: Pick<FieldFormatsRegistry, 'register'>;
  docLinks: DocLinksStart;
  metadata?: MetaData;
}

const AlertsContext = createContext<AlertsContextValue>(null as any);

export const AlertsContextProvider = ({
  children,
  value,
}: {
  value: AlertsContextValue;
  children: React.ReactNode;
}) => {
  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
};

export const useAlertsContext = () => {
  const ctx = useContext(AlertsContext);
  if (!ctx) {
    throw new Error('ActionsConnectorsContext has not been set.');
  }
  return ctx;
};
