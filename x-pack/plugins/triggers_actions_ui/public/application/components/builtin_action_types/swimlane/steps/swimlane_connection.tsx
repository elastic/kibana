/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { Fragment } from 'react';
import { FormattedMessage } from 'react-intl';
import * as i18n from '../translations';
import { StepProps } from './';
import { useKibana } from '../../../../../common/lib/kibana';
import { getApplication } from '../api';

export const SwimlaneConnection: React.FunctionComponent<StepProps> = ({
  action,
  editActionConfig,
  editActionSecrets,
  errors,
  readOnly,
  updateCurrentStep,
  updateFields,
}) => {
  const { http } = useKibana().services;
  const { apiUrl, appId } = action.config;
  const { apiToken } = action.secrets;
  const { docLinks } = useKibana().services;

  const isValid = () => {
    return apiUrl && apiToken && appId;
  };

  const connectSwimlane = async () => {
    // fetch swimlane application configuration
    const application = await getApplication({ http, url: apiUrl, appId, apiToken });

    if (!application) {
      throw new Error(i18n.SW_GET_APPLICATION_API_ERROR(appId));
    }
    const allFields = application.fields;
    updateFields(allFields);
    updateCurrentStep(2);
  };

  const getEncryptedFieldNotifyLabel = (isCreate: boolean) => {
    if (isCreate) {
      return (
        <Fragment>
          <EuiSpacer size="s" />
          <EuiText size="s" data-test-subj="rememberValuesMessage">
            {i18n.SW_REMEMBER_VALUE_LABEL}
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
          title={i18n.SW_REENTER_VALUE_LABEL}
        />
        <EuiSpacer size="m" />
      </Fragment>
    );
  };

  const connectSwimlaneButton = (
    <EuiButton disabled={!isValid()} onClick={connectSwimlane}>
      {i18n.SW_RETRIEVE_CONFIGURATION_LABEL}
    </EuiButton>
  );

  return (
    <Fragment>
      <EuiFormRow id="apiUrl" fullWidth label={i18n.SW_API_URL_TEXT_FIELD_LABEL}>
        <EuiFieldText
          fullWidth
          name="apiUrl"
          value={apiUrl || ''}
          readOnly={readOnly}
          data-test-subj="swimlaneApiUrlInput"
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
      <EuiFormRow id="appId" fullWidth label={i18n.SW_APP_ID_TEXT_FIELD_LABEL}>
        <EuiFieldText
          fullWidth
          name="appId"
          value={appId || ''}
          readOnly={readOnly}
          data-test-subj="swimlaneAppIdInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editActionConfig('appId', e.target.value);
          }}
          onBlur={() => {
            if (!appId) {
              editActionConfig('appId', '');
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="apiToken"
        fullWidth
        helpText={
          <EuiLink
            href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/swimlane-action-type.html`}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.apiTokenNameHelpLabel"
              defaultMessage="Provide a Swimlane API Token"
            />
          </EuiLink>
        }
        error={errors.apiToken}
        isInvalid={errors.apiToken.length > 0 && apiToken !== undefined}
        label={i18n.SW_API_TOKEN_TEXT_FIELD_LABEL}
      >
        <Fragment>
          {getEncryptedFieldNotifyLabel(!action.id)}
          <EuiFieldText
            fullWidth
            isInvalid={errors.apiToken.length > 0 && apiToken !== undefined}
            readOnly={readOnly}
            value={apiToken || ''}
            data-test-subj="swimlaneApiTokenInput"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              editActionSecrets('apiToken', e.target.value);
            }}
            onBlur={() => {
              if (!apiToken) {
                editActionSecrets('apiToken', '');
              }
            }}
          />
        </Fragment>
      </EuiFormRow>
      <EuiSpacer />
      {connectSwimlaneButton}
    </Fragment>
  );
};
