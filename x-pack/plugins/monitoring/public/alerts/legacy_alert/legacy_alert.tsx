/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTextColor, EuiSpacer } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../triggers_actions_ui/public/types';
import { LEGACY_ALERTS } from '../../../common/constants';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { BY_TYPE } from '../../../server/alerts';

export function createLegacyAlertTypes(): AlertTypeModel[] {
  return LEGACY_ALERTS.map((legacyAlert) => {
    const alertCls = BY_TYPE[legacyAlert];
    const alert = new alertCls();
    return {
      id: legacyAlert,
      name: alert.label,
      iconClass: 'bell',
      alertParamsExpression: (props: any) => (
        <Fragment>
          <EuiSpacer />
          <EuiTextColor color="subdued">
            {i18n.translate('xpack.monitoring.alerts.legacyAlert.expressionText', {
              defaultMessage: 'There is nothing to configure.',
            })}
          </EuiTextColor>
          <EuiSpacer />
        </Fragment>
      ),
      defaultActionMessage: '{{context.internalFullMessage}}',
      validate: () => ({ errors: {} }),
      requiresAppContext: false,
    };
  });
}
