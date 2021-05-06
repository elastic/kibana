/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiFieldText, EuiFormRow, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionConnectorFieldsProps } from '../../../../types';
import { PagerDutyActionConnector } from '.././types';
import { useKibana } from '../../../../common/lib/kibana';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';

const PagerDutyActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<PagerDutyActionConnector>
> = ({ errors, action, editActionConfig, editActionSecrets, readOnly }) => {
  const { docLinks } = useKibana().services;
  const { apiUrl } = action.config;
  const { routingKey } = action.secrets;
  return (
    <Fragment>
      <EuiFormRow
        id="apiUrl"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.apiUrlTextFieldLabel',
          {
            defaultMessage: 'API URL (optional)',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="apiUrl"
          value={apiUrl || ''}
          readOnly={readOnly}
          data-test-subj="pagerdutyApiUrlInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editActionConfig('apiUrl', e.target.value);
          }}
          onBlur={() => {
            if (!apiUrl) {
              editActionConfig('apiUrl', '');
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="routingKey"
        fullWidth
        helpText={
          <EuiLink href={docLinks.links.alerting.pagerDutyAction} target="_blank">
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.routingKeyNameHelpLabel"
              defaultMessage="Configure a PagerDuty account"
            />
          </EuiLink>
        }
        error={errors.routingKey}
        isInvalid={errors.routingKey.length > 0 && routingKey !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.routingKeyTextFieldLabel',
          {
            defaultMessage: 'Integration key',
          }
        )}
      >
        <Fragment>
          {getEncryptedFieldNotifyLabel(
            !action.id,
            1,
            action.isMissingSecrets ?? false,
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.reenterValueLabel',
              { defaultMessage: 'This key is encrypted. Please reenter a value for this field.' }
            )
          )}
          <EuiFieldText
            fullWidth
            isInvalid={errors.routingKey.length > 0 && routingKey !== undefined}
            name="routingKey"
            readOnly={readOnly}
            value={routingKey || ''}
            data-test-subj="pagerdutyRoutingKeyInput"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              editActionSecrets('routingKey', e.target.value);
            }}
            onBlur={() => {
              if (!routingKey) {
                editActionSecrets('routingKey', '');
              }
            }}
          />
        </Fragment>
      </EuiFormRow>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { PagerDutyActionConnectorFields as default };
