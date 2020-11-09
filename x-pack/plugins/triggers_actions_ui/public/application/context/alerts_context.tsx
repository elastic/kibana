/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, createContext } from 'react';
import {
  HttpSetup,
  IUiSettingsClient,
  ToastsStart,
  DocLinksStart,
  ApplicationStart,
} from 'kibana/public';
import { ChartsPluginSetup } from 'src/plugins/charts/public';
import { FieldFormatsRegistry } from 'src/plugins/data/common/field_formats';
import { DataPublicPluginStartUi, IndexPatternsContract } from 'src/plugins/data/public';
import { KibanaFeature } from '../../../../features/common';
import { AlertTypeRegistryContract, ActionTypeRegistryContract } from '../../types';

export interface AlertsContextValue<MetaData = Record<string, any>> {
  reloadAlerts?: () => Promise<void>;
  http: HttpSetup;
  alertTypeRegistry: AlertTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  toastNotifications: ToastsStart;
  uiSettings?: IUiSettingsClient;
  charts?: ChartsPluginSetup;
  dataFieldsFormats?: Pick<FieldFormatsRegistry, 'register'>;
  docLinks: DocLinksStart;
  capabilities: ApplicationStart['capabilities'];
  metadata?: MetaData;
  dataUi?: DataPublicPluginStartUi;
  dataIndexPatterns?: IndexPatternsContract;
  kibanaFeatures?: KibanaFeature[];
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
    throw new Error('AlertsContext has not been set.');
  }
  return ctx;
};
