/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiCallOut, EuiFieldText, EuiFormRow, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionConnectorFieldsProps } from '../../../../types';
import { PagerDutyActionConnector } from '.././types';
import { useKibana } from '../../../../common/lib/kibana';

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
          <EuiLink
            href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/pagerduty-action-type.html`}
            target="_blank"
          >
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
          {getEncryptedFieldNotifyLabel(!action.id)}
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

function getEncryptedFieldNotifyLabel(isCreate: boolean) {
  if (isCreate) {
    return (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiText size="s" data-test-subj="rememberValuesMessage">
          <FormattedMessage
            id="xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.rememberValueLabel"
            defaultMessage="Remember this value. You must reenter it each time you edit the connector."
          />
        </EuiText>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
  return (
    <Fragment>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        iconType="iInCircle"
        data-test-subj="reenterValuesMessage"
        title={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.reenterValueLabel',
          { defaultMessage: 'This key is encrypted. Please reenter a value for this field.' }
        )}
      />
      <EuiSpacer size="m" />
    </Fragment>
  );
}

// eslint-disable-next-line import/no-default-export
export { PagerDutyActionConnectorFields as default };
