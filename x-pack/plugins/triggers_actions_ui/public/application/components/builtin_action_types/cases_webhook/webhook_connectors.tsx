/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiTitle,
  EuiSwitch,
  EuiButtonEmpty,
} from '@elastic/eui';
import { ActionConnectorFieldsProps } from '../../../../types';
import { CasesWebhookActionConnector, CasesWebhookConfig, CasesWebhookSecrets } from './types';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';
import { JsonEditorWithMessageVariables } from '../../json_editor_with_message_variables';
import * as i18n from './translations';

const HTTP_VERBS = ['post', 'put', 'patch'];

const CasesWebhookActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<CasesWebhookActionConnector>
> = ({ action, editActionConfig, editActionSecrets, errors, readOnly }) => {
  const { user, password } = action.secrets;
  const {
    createCommentJson,
    createCommentMethod,
    createCommentUrl,
    createIncidentJson,
    createIncidentMethod,
    createIncidentResponseKey,
    createIncidentUrl,
    getIncidentResponseCreatedDateKey,
    getIncidentResponseExternalTitleKey,
    getIncidentResponseUpdatedDateKey,
    incidentViewUrl,
    getIncidentUrl,
    hasAuth,
    headers,
    updateIncidentJson,
    updateIncidentMethod,
    updateIncidentUrl,
  } = action.config;

  const [httpHeaderKey, setHttpHeaderKey] = useState<string>('');
  const [httpHeaderValue, setHttpHeaderValue] = useState<string>('');
  const [hasHeaders, setHasHeaders] = useState<boolean>(false);

  useEffect(() => {
    if (!action.id) {
      editActionConfig('hasAuth', true);
    }

    if (!createIncidentMethod) {
      editActionConfig('createIncidentMethod', 'post'); // set createIncidentMethod to POST by default
    }

    if (!updateIncidentMethod) {
      editActionConfig('updateIncidentMethod', 'put'); // set updateIncidentMethod to PUT by default
    }

    if (!createCommentMethod) {
      editActionConfig('createCommentMethod', 'put'); // set createCommentMethod to PUT by default
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerErrors = useMemo(() => {
    const hErrors = {
      keyHeader: new Array<string>(),
      valueHeader: new Array<string>(),
    };
    if (!httpHeaderKey && httpHeaderValue) {
      hErrors.keyHeader.push(i18n.KEY_REQUIRED);
    }
    if (httpHeaderKey && !httpHeaderValue) {
      hErrors.valueHeader.push(i18n.VALUE_REQUIRED);
    }
    return hErrors;
  }, [httpHeaderKey, httpHeaderValue]);

  const hasHeaderErrors: boolean = useMemo(
    () =>
      (headerErrors.keyHeader !== undefined &&
        headerErrors.valueHeader !== undefined &&
        headerErrors.keyHeader.length > 0) ||
      headerErrors.valueHeader.length > 0,
    [headerErrors.keyHeader, headerErrors.valueHeader]
  );

  const addHeader = useCallback(() => {
    if (headers && !!Object.keys(headers).find((key) => key === httpHeaderKey)) {
      return;
    }
    const updatedHeaders = headers
      ? { ...headers, [httpHeaderKey]: httpHeaderValue }
      : { [httpHeaderKey]: httpHeaderValue };
    editActionConfig('headers', updatedHeaders);
    setHttpHeaderKey('');
    setHttpHeaderValue('');
  }, [editActionConfig, headers, httpHeaderKey, httpHeaderValue]);

  const viewHeaders = useCallback(() => {
    setHasHeaders(!hasHeaders);
    if (!hasHeaders && !headers) {
      editActionConfig('headers', {});
    }
  }, [editActionConfig, hasHeaders, headers]);

  const removeHeader = useCallback(
    (keyToRemove: string) => {
      const updatedHeaders =
        headers != null
          ? Object.keys(headers)
              .filter((key) => key !== keyToRemove)
              .reduce((headerToRemove: Record<string, string>, key: string) => {
                headerToRemove[key] = headers[key];
                return headerToRemove;
              }, {})
          : {};
      editActionConfig('headers', updatedHeaders);
    },
    [editActionConfig, headers]
  );

  const headerControl = useMemo(() => {
    if (hasHeaders) {
      return (
        <>
          <EuiTitle size="xxs">
            <h5>{i18n.ADD_HEADER}</h5>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" alignItems="flexStart">
            <EuiFlexItem grow={false}>
              <EuiFormRow
                id="webhookHeaderKey"
                fullWidth
                error={headerErrors.keyHeader}
                isInvalid={hasHeaderErrors && httpHeaderKey !== undefined}
                label={i18n.KEY_LABEL}
              >
                <EuiFieldText
                  fullWidth
                  isInvalid={hasHeaderErrors && httpHeaderKey !== undefined}
                  name="keyHeader"
                  readOnly={readOnly}
                  value={httpHeaderKey}
                  data-test-subj="webhookHeadersKeyInput"
                  onChange={(e) => {
                    setHttpHeaderKey(e.target.value);
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                id="webhookHeaderValue"
                fullWidth
                error={headerErrors.valueHeader}
                isInvalid={hasHeaderErrors && httpHeaderValue !== undefined}
                label={i18n.VALUE_LABEL}
              >
                <EuiFieldText
                  fullWidth
                  isInvalid={hasHeaderErrors && httpHeaderValue !== undefined}
                  name="valueHeader"
                  readOnly={readOnly}
                  value={httpHeaderValue}
                  data-test-subj="webhookHeadersValueInput"
                  onChange={(e) => {
                    setHttpHeaderValue(e.target.value);
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiButtonEmpty
                  isDisabled={hasHeaders && (hasHeaderErrors || !httpHeaderKey || !httpHeaderValue)}
                  data-test-subj="webhookAddHeaderButton"
                  onClick={addHeader}
                >
                  {i18n.ADD_BUTTON}
                </EuiButtonEmpty>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      );
    }
    return null;
  }, [
    addHeader,
    hasHeaderErrors,
    hasHeaders,
    headerErrors.keyHeader,
    headerErrors.valueHeader,
    httpHeaderKey,
    httpHeaderValue,
    readOnly,
  ]);

  const headersList = useMemo(
    () =>
      Object.keys(headers || {}).map((key: string) => {
        return (
          <EuiFlexGroup key={key} data-test-subj="webhookHeaderText" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label={i18n.DELETE_BUTTON}
                iconType="trash"
                color="danger"
                onClick={() => removeHeader(key)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiDescriptionList compressed>
                <EuiDescriptionListTitle>{key}</EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {headers && headers[key]}
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }),
    [headers, removeHeader]
  );

  const isConfigKeyValueInvalid = useCallback(
    (key: keyof CasesWebhookConfig): boolean =>
      errors[key] !== undefined && errors[key].length > 0 && action.config[key] !== undefined,
    [action.config, errors]
  );
  const isSecretsKeyValueInvalid = useCallback(
    (key: keyof CasesWebhookSecrets): boolean =>
      errors[key] !== undefined && errors[key].length > 0 && action.secrets[key] !== undefined,
    [action.secrets, errors]
  );

  const onConfigChange = useCallback(
    (key: keyof CasesWebhookConfig, value: string) => editActionConfig(key, value),
    [editActionConfig]
  );

  const onConfigBlur = useCallback(
    (key: keyof CasesWebhookConfig) => {
      if (!action.config[key]) {
        editActionConfig(key, '');
      }
    },
    [action.config, editActionConfig]
  );
  const onSecretsChange = useCallback(
    (key: keyof CasesWebhookSecrets, value: string) => editActionSecrets(key, value),
    [editActionSecrets]
  );

  const onSecretsBlur = useCallback(
    (key: keyof CasesWebhookSecrets) => {
      if (!action.secrets[key]) {
        editActionSecrets(key, '');
      }
    },
    [action.secrets, editActionSecrets]
  );

  return (
    <>
      {/* start CREATE INCIDENT INPUTS */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFormRow label={i18n.CREATE_INCIDENT_METHOD}>
            <EuiSelect
              name="createIncidentMethod"
              value={createIncidentMethod || 'post'}
              disabled={readOnly}
              data-test-subj="webhookCreateMethodSelect"
              options={HTTP_VERBS.map((verb) => ({ text: verb.toUpperCase(), value: verb }))}
              onChange={(e) => onConfigChange('createIncidentMethod', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="createIncidentUrl"
            fullWidth
            error={errors.createIncidentUrl}
            isInvalid={isConfigKeyValueInvalid('createIncidentUrl')}
            label={i18n.CREATE_INCIDENT_URL}
          >
            <EuiFieldText
              name="createIncidentUrl"
              isInvalid={isConfigKeyValueInvalid('createIncidentUrl')}
              fullWidth
              readOnly={readOnly}
              value={createIncidentUrl || ''}
              data-test-subj="webhookCreateUrlText"
              onChange={(e) => onConfigChange('createIncidentUrl', e.target.value)}
              onBlur={() => onConfigBlur('createIncidentUrl')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="createIncidentJson"
            fullWidth
            isInvalid={isConfigKeyValueInvalid('createIncidentJson')}
            label={i18n.CREATE_INCIDENT_JSON}
            helpText={i18n.CREATE_INCIDENT_JSON_HELP}
          >
            <JsonEditorWithMessageVariables
              inputTargetValue={createIncidentJson}
              paramsProperty={'createIncidentJson'}
              label={i18n.JSON}
              aria-label={i18n.CODE_EDITOR}
              errors={errors.createIncidentJson as string[]}
              onDocumentsChange={(json: string) => onConfigChange('createIncidentJson', json)}
              onBlur={() => onConfigBlur('createIncidentJson')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="createIncidentResponseKey"
            fullWidth
            error={errors.createIncidentResponseKey}
            isInvalid={isConfigKeyValueInvalid('createIncidentResponseKey')}
            label={i18n.CREATE_INCIDENT_RESPONSE_KEY}
            helpText={i18n.CREATE_INCIDENT_RESPONSE_KEY_HELP}
          >
            <EuiFieldText
              name="createIncidentResponseKey"
              isInvalid={isConfigKeyValueInvalid('createIncidentResponseKey')}
              fullWidth
              readOnly={readOnly}
              value={createIncidentResponseKey || ''}
              data-test-subj="createIncidentResponseKeyText"
              onChange={(e) => onConfigChange('createIncidentResponseKey', e.target.value)}
              onBlur={() => onConfigBlur('createIncidentResponseKey')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* end CREATE INCIDENT INPUTS */}
      {/* start GET INCIDENT INPUTS */}
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFormRow
            id="getIncidentUrl"
            fullWidth
            error={errors.getIncidentUrl}
            isInvalid={isConfigKeyValueInvalid('getIncidentUrl')}
            label={i18n.GET_INCIDENT_URL}
            helpText={i18n.GET_INCIDENT_URL_HELP}
          >
            <EuiFieldText
              name="getIncidentUrl"
              isInvalid={isConfigKeyValueInvalid('getIncidentUrl')}
              fullWidth
              readOnly={readOnly}
              value={getIncidentUrl || ''}
              data-test-subj="webhookCreateUrlText"
              onChange={(e) => onConfigChange('getIncidentUrl', e.target.value)}
              onBlur={() => onConfigBlur('getIncidentUrl')}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="getIncidentResponseExternalTitleKey"
            fullWidth
            error={errors.getIncidentResponseExternalTitleKey}
            isInvalid={isConfigKeyValueInvalid('getIncidentResponseExternalTitleKey')}
            label={i18n.GET_INCIDENT_TITLE_KEY}
            helpText={i18n.GET_INCIDENT_TITLE_KEY_HELP}
          >
            <EuiFieldText
              name="getIncidentResponseExternalTitleKey"
              isInvalid={isConfigKeyValueInvalid('getIncidentResponseExternalTitleKey')}
              fullWidth
              readOnly={readOnly}
              value={getIncidentResponseExternalTitleKey || ''}
              data-test-subj="getIncidentResponseExternalTitleKeyText"
              onChange={(e) =>
                onConfigChange('getIncidentResponseExternalTitleKey', e.target.value)
              }
              onBlur={() => onConfigBlur('getIncidentResponseExternalTitleKey')}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="getIncidentResponseCreatedDateKey"
            fullWidth
            error={errors.getIncidentResponseCreatedDateKey}
            isInvalid={isConfigKeyValueInvalid('getIncidentResponseCreatedDateKey')}
            label={i18n.GET_INCIDENT_CREATED_KEY}
            helpText={i18n.GET_INCIDENT_CREATED_KEY_HELP}
          >
            <EuiFieldText
              name="getIncidentResponseCreatedDateKey"
              isInvalid={isConfigKeyValueInvalid('getIncidentResponseCreatedDateKey')}
              fullWidth
              readOnly={readOnly}
              value={getIncidentResponseCreatedDateKey || ''}
              data-test-subj="getIncidentResponseCreatedDateKeyText"
              onChange={(e) => onConfigChange('getIncidentResponseCreatedDateKey', e.target.value)}
              onBlur={() => onConfigBlur('getIncidentResponseCreatedDateKey')}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="getIncidentResponseUpdatedDateKey"
            fullWidth
            error={errors.getIncidentResponseUpdatedDateKey}
            isInvalid={isConfigKeyValueInvalid('getIncidentResponseUpdatedDateKey')}
            label={i18n.GET_INCIDENT_UPDATED_KEY}
            helpText={i18n.GET_INCIDENT_UPDATED_KEY_HELP}
          >
            <EuiFieldText
              name="getIncidentResponseUpdatedDateKey"
              isInvalid={isConfigKeyValueInvalid('getIncidentResponseUpdatedDateKey')}
              fullWidth
              readOnly={readOnly}
              value={getIncidentResponseUpdatedDateKey || ''}
              data-test-subj="getIncidentResponseUpdatedDateKeyText"
              onChange={(e) => onConfigChange('getIncidentResponseUpdatedDateKey', e.target.value)}
              onBlur={() => onConfigBlur('getIncidentResponseUpdatedDateKey')}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="incidentViewUrl"
            fullWidth
            error={errors.incidentViewUrl}
            isInvalid={isConfigKeyValueInvalid('incidentViewUrl')}
            label={i18n.EXTERNAL_INCIDENT_VIEW_URL}
            helpText={i18n.EXTERNAL_INCIDENT_VIEW_URL_HELP}
          >
            <EuiFieldText
              name="incidentViewUrl"
              isInvalid={isConfigKeyValueInvalid('incidentViewUrl')}
              fullWidth
              readOnly={readOnly}
              value={incidentViewUrl || ''}
              data-test-subj="incidentViewUrlText"
              onChange={(e) => onConfigChange('incidentViewUrl', e.target.value)}
              onBlur={() => onConfigBlur('incidentViewUrl')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* end GET INCIDENT INPUTS */}
      {/* start UPDATE INCIDENT INPUTS */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFormRow label={i18n.UPDATE_INCIDENT_METHOD}>
            <EuiSelect
              name="updateIncidentMethod"
              value={updateIncidentMethod || 'put'}
              disabled={readOnly}
              data-test-subj="webhookUpdateMethodSelect"
              options={HTTP_VERBS.map((verb) => ({ text: verb.toUpperCase(), value: verb }))}
              onChange={(e) => onConfigChange('updateIncidentMethod', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="updateIncidentUrl"
            fullWidth
            error={errors.updateIncidentUrl}
            isInvalid={isConfigKeyValueInvalid('updateIncidentUrl')}
            label={i18n.UPDATE_INCIDENT_URL}
            helpText={i18n.UPDATE_INCIDENT_URL_HELP}
          >
            <EuiFieldText
              name="updateIncidentUrl"
              isInvalid={isConfigKeyValueInvalid('updateIncidentUrl')}
              fullWidth
              readOnly={readOnly}
              value={updateIncidentUrl || ''}
              data-test-subj="webhookUpdateUrlText"
              onChange={(e) => onConfigChange('updateIncidentUrl', e.target.value)}
              onBlur={() => onConfigBlur('updateIncidentUrl')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="updateIncidentJson"
            fullWidth
            isInvalid={isConfigKeyValueInvalid('updateIncidentJson')}
            label={i18n.UPDATE_INCIDENT_JSON}
            helpText={i18n.UPDATE_INCIDENT_JSON_HELP}
          >
            <JsonEditorWithMessageVariables
              inputTargetValue={updateIncidentJson}
              paramsProperty={'updateIncidentJson'}
              label={i18n.JSON}
              aria-label={i18n.CODE_EDITOR}
              errors={errors.updateIncidentJson as string[]}
              onDocumentsChange={(json: string) => onConfigChange('updateIncidentJson', json)}
              onBlur={() => onConfigBlur('updateIncidentJson')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* end UPDATE INCIDENT INPUTS */}
      {/* start CREATE COMMENT INCIDENT INPUTS */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFormRow label={i18n.CREATE_COMMENT_METHOD}>
            <EuiSelect
              name="createCommentMethod"
              value={createCommentMethod || 'put'}
              disabled={readOnly}
              data-test-subj="webhookCreateCommentMethodSelect"
              options={HTTP_VERBS.map((verb) => ({ text: verb.toUpperCase(), value: verb }))}
              onChange={(e) => onConfigChange('createCommentMethod', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="createCommentUrl"
            fullWidth
            error={errors.createCommentUrl}
            isInvalid={isConfigKeyValueInvalid('createCommentUrl')}
            label={i18n.CREATE_COMMENT_URL}
            helpText={i18n.CREATE_COMMENT_URL_HELP}
          >
            <EuiFieldText
              name="createCommentUrl"
              isInvalid={isConfigKeyValueInvalid('createCommentUrl')}
              fullWidth
              readOnly={readOnly}
              value={createCommentUrl || ''}
              data-test-subj="webhookUpdateUrlText"
              onChange={(e) => onConfigChange('createCommentUrl', e.target.value)}
              onBlur={() => onConfigBlur('createCommentUrl')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="createCommentJson"
            fullWidth
            isInvalid={isConfigKeyValueInvalid('createCommentJson')}
            label={i18n.CREATE_COMMENT_JSON}
            helpText={i18n.CREATE_COMMENT_JSON_HELP}
          >
            <JsonEditorWithMessageVariables
              inputTargetValue={createCommentJson}
              paramsProperty={'createCommentJson'}
              label={i18n.JSON}
              aria-label={i18n.CODE_EDITOR}
              errors={errors.createCommentJson as string[]}
              onDocumentsChange={(json: string) => onConfigChange('createCommentJson', json)}
              onBlur={() => onConfigBlur('createCommentJson')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* end CREATE COMMENT INCIDENT INPUTS */}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>{i18n.AUTH_TITLE}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiSwitch
            label={i18n.HAS_AUTH}
            disabled={readOnly}
            checked={hasAuth}
            onChange={(e) => {
              editActionConfig('hasAuth', e.target.checked);
              if (!e.target.checked) {
                editActionSecrets('user', null);
                editActionSecrets('password', null);
              }
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasAuth ? (
        <>
          {getEncryptedFieldNotifyLabel(
            !action.id,
            2,
            action.isMissingSecrets ?? false,
            i18n.REENTER_VALUES
          )}
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFormRow
                id="webhookUser"
                fullWidth
                error={errors.user}
                isInvalid={isSecretsKeyValueInvalid('user')}
                label={i18n.USERNAME}
              >
                <EuiFieldText
                  fullWidth
                  isInvalid={isSecretsKeyValueInvalid('user')}
                  name="user"
                  readOnly={readOnly}
                  value={user || ''}
                  data-test-subj="webhookUserInput"
                  onChange={(e) => onSecretsChange('user', e.target.value)}
                  onBlur={() => onSecretsBlur('user')}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                id="webhookPassword"
                fullWidth
                error={errors.password}
                isInvalid={isSecretsKeyValueInvalid('password')}
                label={i18n.PASSWORD}
              >
                <EuiFieldPassword
                  fullWidth
                  name="password"
                  readOnly={readOnly}
                  isInvalid={isSecretsKeyValueInvalid('password')}
                  value={password || ''}
                  data-test-subj="webhookPasswordInput"
                  onChange={(e) => onSecretsChange('password', e.target.value)}
                  onBlur={() => onSecretsBlur('password')}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}
      <EuiSpacer size="m" />
      <EuiSwitch
        data-test-subj="webhookViewHeadersSwitch"
        disabled={readOnly}
        label={i18n.HEADERS_SWITCH}
        checked={hasHeaders}
        onChange={viewHeaders}
      />

      <EuiSpacer size="m" />
      <div>
        {Object.keys(headers || {}).length > 0 ? (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h5>{i18n.HEADERS_TITLE}</h5>
            </EuiTitle>
            <EuiSpacer size="s" />
            {headersList}
          </>
        ) : null}
        <EuiSpacer size="m" />
        {hasHeaders && headerControl}
        <EuiSpacer size="m" />
      </div>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { CasesWebhookActionConnectorFields as default };
