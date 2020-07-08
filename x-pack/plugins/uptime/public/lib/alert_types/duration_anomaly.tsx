/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { AlertTypeModel } from '../../../../triggers_actions_ui/public';
import { CLIENT_ALERT_TYPES } from '../../../common/constants';
import { DurationAnomalyTranslations } from './translations';
import { AlertTypeInitializer } from '.';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { store } from '../../state';

const { name, defaultActionMessage } = DurationAnomalyTranslations;
const AnomalyAlertExpression = React.lazy(() =>
  import('../../components/overview/alerts/anomaly_alert/anomaly_alert')
);
export const initDurationAnomalyAlertType: AlertTypeInitializer = ({
  core,
  plugins,
}): AlertTypeModel => ({
  id: CLIENT_ALERT_TYPES.DURATION_ANOMALY,
  iconClass: 'uptimeApp',
  alertParamsExpression: (params: any) => (
    <ReduxProvider store={store}>
      <KibanaContextProvider services={{ ...core, ...plugins }}>
        <AnomalyAlertExpression {...params} />
      </KibanaContextProvider>
    </ReduxProvider>
  ),
  name,
  validate: () => ({ errors: {} }),
  defaultActionMessage,
  requiresAppContext: false,
});
