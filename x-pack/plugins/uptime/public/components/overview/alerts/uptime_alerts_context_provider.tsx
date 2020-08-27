/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  HttpStart,
  NotificationsStart,
  IUiSettingsClient,
  DocLinksStart,
  ApplicationStart,
} from 'src/core/public';
import { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';
import { ChartsPluginStart } from '../../../../../../../src/plugins/charts/public';
import {
  AlertsContextProvider,
  TriggersAndActionsUIPublicPluginStart,
} from '../../../../../../plugins/triggers_actions_ui/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

interface KibanaDeps {
  http: HttpStart;
  notifications: NotificationsStart;
  uiSettings: IUiSettingsClient;
  docLinks: DocLinksStart;
  application: ApplicationStart;

  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginStart;
}

export const UptimeAlertsContextProvider: React.FC = ({ children }) => {
  const {
    services: {
      data: { fieldFormats },
      http,
      charts,
      notifications,
      triggers_actions_ui: { actionTypeRegistry, alertTypeRegistry },
      uiSettings,
      docLinks,
      application: { capabilities },
    },
  } = useKibana<KibanaDeps>();

  return (
    <AlertsContextProvider
      value={{
        actionTypeRegistry,
        alertTypeRegistry,
        charts,
        docLinks,
        dataFieldsFormats: fieldFormats,
        http,
        toastNotifications: notifications?.toasts,
        uiSettings,
        capabilities,
      }}
    >
      {children}
    </AlertsContextProvider>
  );
};
