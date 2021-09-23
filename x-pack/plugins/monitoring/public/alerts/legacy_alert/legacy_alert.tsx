/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTextColor, EuiSpacer } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertTypeModel } from '../../../../triggers_actions_ui/public/types';
import {
  LEGACY_RULES,
  LEGACY_RULE_DETAILS,
  RULE_REQUIRES_APP_CONTEXT,
} from '../../../common/constants';

export function createLegacyAlertTypes(): AlertTypeModel[] {
  return LEGACY_RULES.map((legacyAlert) => {
    return {
      id: legacyAlert,
      description: LEGACY_RULE_DETAILS[legacyAlert].description,
      iconClass: 'bell',
      documentationUrl(docLinks) {
        return `${docLinks.links.monitoring.alertsKibanaClusterAlerts}`;
      },
      alertParamsExpression: () => (
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
      requiresAppContext: RULE_REQUIRES_APP_CONTEXT,
    };
  });
}
