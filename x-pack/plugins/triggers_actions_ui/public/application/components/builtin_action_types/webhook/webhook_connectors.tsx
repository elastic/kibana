/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiCallOut,
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
  EuiText,
  EuiTitle,
  EuiSwitch,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionConnectorFieldsProps } from '../../../../types';
import { WebhookActionConnector } from '../types';

const HTTP_VERBS = ['post', 'put'];

const WebhookActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps<WebhookActionConnector>
> = ({ action, editActionConfig, editActionSecrets, errors, readOnly }) => {
  const { user, password } = action.secrets;
  const { method, url, headers, hasAuth } = action.config;

  const [httpHeaderKey, setHttpHeaderKey] = useState<string>('');
  const [httpHeaderValue, setHttpHeaderValue] = useState<string>('');
  const [hasHeaders, setHasHeaders] = useState<boolean>(false);

  useEffect(() => {
    if (!action.id) {
      editActionConfig('hasAuth', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!method) {
    editActionConfig('method', 'post'); // set method to POST by default
  }

  const headerErrors = {
    keyHeader: new Array<string>(),
    valueHeader: new Array<string>(),
  };
  if (!httpHeaderKey && httpHeaderValue) {
    headerErrors.keyHeader.push(
      i18n.translate(
        'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredHeaderKeyText',
        {
          defaultMessage: 'Key is required.',
        }
      )
    );
  }
  if (httpHeaderKey && !httpHeaderValue) {
    headerErrors.valueHeader.push(
      i18n.translate(
        'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredHeaderValueText',
        {
          defaultMessage: 'Value is required.',
        }
      )
    );
  }
  const hasHeaderErrors = headerErrors.keyHeader.length > 0 || headerErrors.valueHeader.length > 0;

  function addHeader() {
    if (headers && !!Object.keys(headers).find((key) => key === httpHeaderKey)) {
      return;
    }
    const updatedHeaders = headers
      ? { ...headers, [httpHeaderKey]: httpHeaderValue }
      : { [httpHeaderKey]: httpHeaderValue };
    editActionConfig('headers', updatedHeaders);
    setHttpHeaderKey('');
    setHttpHeaderValue('');
  }

  function viewHeaders() {
    setHasHeaders(!hasHeaders);
    if (!hasHeaders && !headers) {
      editActionConfig('headers', {});
    }
  }

  function removeHeader(keyToRemove: string) {
    const updatedHeaders = Object.keys(headers)
      .filter((key) => key !== keyToRemove)
      .reduce((headerToRemove: Record<string, string>, key: string) => {
        headerToRemove[key] = headers[key];
        return headerToRemove;
      }, {});
    editActionConfig('headers', updatedHeaders);
  }

  let headerControl;
  if (hasHeaders) {
    headerControl = (
      <Fragment>
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              defaultMessage="Add header"
              id="xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.addHeader"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" alignItems="flexStart">
          <EuiFlexItem grow={false}>
            <EuiFormRow
              id="webhookHeaderKey"
              fullWidth
              error={headerErrors.keyHeader}
              isInvalid={hasHeaderErrors && httpHeaderKey !== undefined}
              label={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.keyTextFieldLabel',
                {
                  defaultMessage: 'Key',
                }
              )}
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
              label={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.valueTextFieldLabel',
                {
                  defaultMessage: 'Value',
                }
              )}
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
                onClick={() => addHeader()}
              >
                <FormattedMessage
                  defaultMessage="Add"
                  id="xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.addHeaderButton"
                />
              </EuiButtonEmpty>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }

  const headersList = Object.keys(headers || {}).map((key: string) => {
    return (
      <EuiFlexGroup key={key} data-test-subj="webhookHeaderText" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            aria-label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.deleteHeaderButton',
              {
                defaultMessage: 'Delete',
                description: 'Delete HTTP header',
              }
            )}
            iconType="trash"
            color="danger"
            onClick={() => removeHeader(key)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiDescriptionList compressed>
            <EuiDescriptionListTitle>{key}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>{headers[key]}</EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  });

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.methodTextFieldLabel',
              {
                defaultMessage: 'Method',
              }
            )}
          >
            <EuiSelect
              name="method"
              value={method || 'post'}
              disabled={readOnly}
              data-test-subj="webhookMethodSelect"
              options={HTTP_VERBS.map((verb) => ({ text: verb.toUpperCase(), value: verb }))}
              onChange={(e) => {
                editActionConfig('method', e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="url"
            fullWidth
            error={errors.url}
            isInvalid={errors.url.length > 0 && url !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.urlTextFieldLabel',
              {
                defaultMessage: 'URL',
              }
            )}
          >
            <EuiFieldText
              name="url"
              isInvalid={errors.url.length > 0 && url !== undefined}
              fullWidth
              readOnly={readOnly}
              value={url || ''}
              data-test-subj="webhookUrlText"
              onChange={(e) => {
                editActionConfig('url', e.target.value);
              }}
              onBlur={() => {
                if (!url) {
                  editActionConfig('url', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.authenticationLabel"
                defaultMessage="Authentication"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiSwitch
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.hasAuthSwitchLabel',
              {
                defaultMessage: 'Require authentication for this webhook',
              }
            )}
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
          {getEncryptedFieldNotifyLabel(!action.id)}
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFormRow
                id="webhookUser"
                fullWidth
                error={errors.user}
                isInvalid={errors.user.length > 0 && user !== undefined}
                label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.userTextFieldLabel',
                  {
                    defaultMessage: 'Username',
                  }
                )}
              >
                <EuiFieldText
                  fullWidth
                  isInvalid={errors.user.length > 0 && user !== undefined}
                  name="user"
                  readOnly={readOnly}
                  value={user || ''}
                  data-test-subj="webhookUserInput"
                  onChange={(e) => {
                    editActionSecrets('user', e.target.value);
                  }}
                  onBlur={() => {
                    if (!user) {
                      editActionSecrets('user', '');
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                id="webhookPassword"
                fullWidth
                error={errors.password}
                isInvalid={errors.password.length > 0 && password !== undefined}
                label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.passwordTextFieldLabel',
                  {
                    defaultMessage: 'Password',
                  }
                )}
              >
                <EuiFieldPassword
                  fullWidth
                  name="password"
                  readOnly={readOnly}
                  isInvalid={errors.password.length > 0 && password !== undefined}
                  value={password || ''}
                  data-test-subj="webhookPasswordInput"
                  onChange={(e) => {
                    editActionSecrets('password', e.target.value);
                  }}
                  onBlur={() => {
                    if (!password) {
                      editActionSecrets('password', '');
                    }
                  }}
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
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.viewHeadersSwitch',
          {
            defaultMessage: 'Add HTTP header',
          }
        )}
        checked={hasHeaders}
        onChange={() => viewHeaders()}
      />

      <EuiSpacer size="m" />
      <div>
        {Object.keys(headers || {}).length > 0 ? (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h5>
                <FormattedMessage
                  defaultMessage="Headers in use"
                  id="xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.httpHeadersTitle"
                />
              </h5>
            </EuiTitle>
            <EuiSpacer size="s" />
            {headersList}
          </>
        ) : null}
        <EuiSpacer size="m" />
        {hasHeaders && headerControl}
        <EuiSpacer size="m" />
      </div>
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
            id="xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.rememberValuesLabel"
            defaultMessage="Remember these values. You must reenter them each time you edit the connector."
          />
        </EuiText>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
  return (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiCallOut
        size="s"
        iconType="iInCircle"
        data-test-subj="reenterValuesMessage"
        title={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.reenterValuesLabel',
          {
            defaultMessage:
              'Username and password are encrypted. Please reenter values for these fields.',
          }
        )}
      />
      <EuiSpacer size="m" />
    </Fragment>
  );
}

// eslint-disable-next-line import/no-default-export
export { WebhookActionConnectorFields as default };
