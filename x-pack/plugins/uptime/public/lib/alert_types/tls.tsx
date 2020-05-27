/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { AlertTypeModel } from '../../../../triggers_actions_ui/public';
import { CLIENT_ALERT_TYPES } from '../../../common/constants';
import { TlsTranslations } from './translations';
import { AlertTypeInitializer } from '.';
import { AlertTls } from '../../components/overview/alerts/alerts_containers/alert_tls';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';

const { name, defaultActionMessage } = TlsTranslations;

export const initTlsAlertType: AlertTypeInitializer = ({
  store,
  core,
  plugins,
}): AlertTypeModel => ({
  id: CLIENT_ALERT_TYPES.TLS,
  iconClass: 'uptimeApp',
  alertParamsExpression: React.lazy(() =>
    import('../../components/overview/alerts/alerts_containers/alert_tls')
  ),
  name,
  validate: () => ({ errors: {} }),
  defaultActionMessage,
  requiresAppContext: false,
});
