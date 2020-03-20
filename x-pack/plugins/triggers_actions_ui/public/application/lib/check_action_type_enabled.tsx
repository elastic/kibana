/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCard, EuiLink } from '@elastic/eui';
import { ActionType } from '../../types';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../common/constants';
import './check_action_type_enabled.scss';

export interface IsEnabledResult {
  isEnabled: true;
}
export interface IsDisabledResult {
  isEnabled: false;
  message: string;
  messageCard: JSX.Element;
}

export function checkActionTypeEnabled(
  actionType?: ActionType
): IsEnabledResult | IsDisabledResult {
  if (actionType?.enabledInLicense === false) {
    return {
      isEnabled: false,
      message: i18n.translate(
        'xpack.triggersActionsUI.checkActionTypeEnabled.actionTypeDisabledByLicenseMessage',
        {
          defaultMessage:
            'This connector is disabled because it requires a {minimumLicenseRequired} license.',
          values: {
            minimumLicenseRequired: actionType.minimumLicenseRequired,
          },
        }
      ),
      messageCard: (
        <EuiCard
          titleSize="xs"
          title={i18n.translate(
            'xpack.triggersActionsUI.sections.alertForm.actionTypeDisabledByLicenseMessageTitle',
            {
              defaultMessage: 'This feature requires a {minimumLicenseRequired} license.',
              values: {
                minimumLicenseRequired: actionType.minimumLicenseRequired,
              },
            }
          )}
          // The "re-enable" terminology is used here because this message is used when an alert
          // action was previously enabled and needs action to be re-enabled.
          description={i18n.translate(
            'xpack.triggersActionsUI.sections.alertForm.actionTypeDisabledByLicenseMessageDescription',
            { defaultMessage: 'To re-enable this action, please upgrade your license.' }
          )}
          className="actCheckActionTypeEnabled__disabledActionWarningCard"
          children={
            <EuiLink href={VIEW_LICENSE_OPTIONS_LINK} target="_blank">
              <FormattedMessage
                defaultMessage="View license options"
                id="xpack.triggersActionsUI.sections.alertForm.actionTypeDisabledByLicenseLinkTitle"
              />
            </EuiLink>
          }
        />
      ),
    };
  }

  if (actionType?.enabledInConfig === false) {
    return {
      isEnabled: false,
      message: i18n.translate(
        'xpack.triggersActionsUI.checkActionTypeEnabled.actionTypeDisabledByConfigMessage',
        { defaultMessage: 'This connector is disabled by the Kibana configuration.' }
      ),
      messageCard: (
        <EuiCard
          title={i18n.translate(
            'xpack.triggersActionsUI.sections.alertForm.actionTypeDisabledByConfigMessageTitle',
            { defaultMessage: 'This feature is disabled by the Kibana configuration.' }
          )}
          description=""
          className="actCheckActionTypeEnabled__disabledActionWarningCard"
        />
      ),
    };
  }

  return { isEnabled: true };
}
