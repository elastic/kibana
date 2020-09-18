/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AlertTypeModel } from '../../../../triggers_actions_ui/public';
import { CLIENT_ALERT_TYPES } from '../../../common/constants/alerts';
import { TlsTranslations } from './translations';
import { AlertTypeInitializer } from '.';

const { name, defaultActionMessage } = TlsTranslations;
const TLSAlert = React.lazy(() => import('./lazy_wrapper/tls_alert'));
export const initTlsAlertType: AlertTypeInitializer = ({ core, plugins }): AlertTypeModel => ({
  id: CLIENT_ALERT_TYPES.TLS,
  iconClass: 'uptimeApp',
  alertParamsExpression: (params: any) => (
    <TLSAlert core={core} plugins={plugins} params={params} />
  ),
  name,
  validate: () => ({ errors: {} }),
  defaultActionMessage,
  requiresAppContext: false,
});
