/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiFieldPassword,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from '../translations';
import { useKibana } from '../../../../../common/lib/kibana';
import { SwimlaneActionConnector } from '../types';
import { IErrorObject } from '../../../../../types';

interface Props {
  action: SwimlaneActionConnector;
  editActionConfig: (property: string, value: any) => void;
  editActionSecrets: (property: string, value: any) => void;
  errors: IErrorObject;
  readOnly: boolean;
}

const SwimlaneConnectionComponent: React.FunctionComponent<Props> = ({
  action,
  editActionConfig,
  editActionSecrets,
  errors,
  readOnly,
}) => {
  const { apiUrl, appId } = action.config;
  const { apiToken } = action.secrets;
  const { docLinks } = useKibana().services;

  const onChangeConfig = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, key: 'apiUrl' | 'appId') => {
      editActionConfig(key, e.target.value);
    },
    [editActionConfig]
  );

  const onBlurConfig = useCallback(
    (key: 'apiUrl' | 'appId') => {
      if (!action.config[key]) {
        editActionConfig(key, '');
      }
    },
    [action.config, editActionConfig]
  );

  const onChangeSecrets = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      editActionSecrets('apiToken', e.target.value);
    },
    [editActionSecrets]
  );

  const onBlurSecrets = useCallback(() => {
    if (!apiToken) {
      editActionSecrets('apiToken', '');
    }
  }, [apiToken, editActionSecrets]);

  const isApiUrlInvalid = errors.apiUrl?.length > 0 && apiToken !== undefined;
  const isAppIdInvalid = errors.appId?.length > 0 && apiToken !== undefined;
  const isApiTokenInvalid = errors.apiToken?.length > 0 && apiToken !== undefined;

  return (
    <>
      <EuiFormRow
        id="apiUrl"
        fullWidth
        label={i18n.SW_API_URL_TEXT_FIELD_LABEL}
        error={errors.apiUrl}
        isInvalid={isApiUrlInvalid}
      >
        <EuiFieldText
          fullWidth
          name="apiUrl"
          value={apiUrl ?? ''}
          readOnly={readOnly}
          isInvalid={isApiUrlInvalid}
          data-test-subj="swimlaneApiUrlInput"
          onChange={(e) => onChangeConfig(e, 'apiUrl')}
          onBlur={() => onBlurConfig('apiUrl')}
        />
      </EuiFormRow>
      <EuiFormRow
        id="appId"
        fullWidth
        label={i18n.SW_APP_ID_TEXT_FIELD_LABEL}
        error={errors.appId}
        isInvalid={isAppIdInvalid}
      >
        <EuiFieldText
          fullWidth
          name="appId"
          value={appId ?? ''}
          readOnly={readOnly}
          isInvalid={isAppIdInvalid}
          data-test-subj="swimlaneAppIdInput"
          onChange={(e) => onChangeConfig(e, 'appId')}
          onBlur={() => onBlurConfig('appId')}
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
        isInvalid={isApiTokenInvalid}
        label={i18n.SW_API_TOKEN_TEXT_FIELD_LABEL}
      >
        <>
          {!action.id ? (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s" data-test-subj="rememberValuesMessage">
                {i18n.SW_REMEMBER_VALUE_LABEL}
              </EuiText>
              <EuiSpacer size="s" />
            </>
          ) : (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                size="s"
                iconType="iInCircle"
                data-test-subj="reenterValuesMessage"
                title={i18n.SW_REENTER_VALUE_LABEL}
              />
              <EuiSpacer size="m" />
            </>
          )}
          <EuiFieldPassword
            fullWidth
            isInvalid={isApiTokenInvalid}
            readOnly={readOnly}
            value={apiToken ?? ''}
            data-test-subj="swimlaneApiTokenInput"
            onChange={onChangeSecrets}
            onBlur={onBlurSecrets}
          />
        </>
      </EuiFormRow>
    </>
  );
};

export const SwimlaneConnection = React.memo(SwimlaneConnectionComponent);
