/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

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
  EuiCodeEditor,
  EuiSwitch,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel,
  ActionConnectorFieldsProps,
  ValidationResult,
  ActionParamsProps,
} from '../../../types';
import { WebhookActionParams, WebhookActionConnector } from './types';

const HTTP_VERBS = ['post', 'put'];

export function getActionType(): ActionTypeModel {
  return {
    id: '.webhook',
    iconClass: 'logoWebhook',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.selectMessageText',
      {
        defaultMessage: 'Send a request to a web service.',
      }
    ),
    validateConnector: (action: WebhookActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        url: new Array<string>(),
        method: new Array<string>(),
        user: new Array<string>(),
        password: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.config.url) {
        errors.url.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.error.requiredUrlText',
            {
              defaultMessage: 'URL is required.',
            }
          )
        );
      }
      if (!action.config.method) {
        errors.method.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredMethodText',
            {
              defaultMessage: 'Method is required.',
            }
          )
        );
      }
      if (!action.secrets.user && action.secrets.password) {
        errors.user.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredHostText',
            {
              defaultMessage: 'Username is required.',
            }
          )
        );
      }
      if (!action.secrets.password && action.secrets.user) {
        errors.password.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredPasswordText',
            {
              defaultMessage: 'Password is required.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (actionParams: WebhookActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        body: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!actionParams.body?.length) {
        errors.body.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredWebhookBodyText',
            {
              defaultMessage: 'Body is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: WebhookActionConnectorFields,
    actionParamsFields: WebhookParamsFields,
  };
}

const WebhookActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  WebhookActionConnector
>> = ({ action, editActionConfig, editActionSecrets, errors }) => {
  const [httpHeaderKey, setHttpHeaderKey] = useState<string>('');
  const [httpHeaderValue, setHttpHeaderValue] = useState<string>('');
  const [hasHeaders, setHasHeaders] = useState<boolean>(false);

  const { user, password } = action.secrets;
  const { method, url, headers } = action.config;

  editActionConfig('method', 'post'); // set method to POST by default

  const headerErrors = {
    keyHeader: new Array<string>(),
    valueHeader: new Array<string>(),
  };
  if (!httpHeaderKey && httpHeaderValue) {
    headerErrors.keyHeader.push(
      i18n.translate(
        'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredHeaderKeyText',
        {
          defaultMessage: 'Header key is required.',
        }
      )
    );
  }
  if (httpHeaderKey && !httpHeaderValue) {
    headerErrors.valueHeader.push(
      i18n.translate(
        'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredHeaderValueText',
        {
          defaultMessage: 'Header value is required.',
        }
      )
    );
  }
  const hasHeaderErrors = headerErrors.keyHeader.length > 0 || headerErrors.valueHeader.length > 0;

  function addHeader() {
    if (headers && !!Object.keys(headers).find(key => key === httpHeaderKey)) {
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
    if (!hasHeaders) {
      editActionConfig('headers', {});
    }
  }

  function removeHeader(keyToRemove: string) {
    const updatedHeaders = Object.keys(headers)
      .filter(key => key !== keyToRemove)
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
              defaultMessage="Add a new header"
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
                value={httpHeaderKey}
                data-test-subj="webhookHeadersKeyInput"
                onChange={e => {
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
                value={httpHeaderValue}
                data-test-subj="webhookHeadersValueInput"
                onChange={e => {
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
              data-test-subj="webhookMethodSelect"
              options={HTTP_VERBS.map(verb => ({ text: verb.toUpperCase(), value: verb }))}
              onChange={e => {
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
              value={url || ''}
              data-test-subj="webhookUrlText"
              onChange={e => {
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
              value={user || ''}
              data-test-subj="webhookUserInput"
              onChange={e => {
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
              isInvalid={errors.password.length > 0 && password !== undefined}
              value={password || ''}
              data-test-subj="webhookPasswordInput"
              onChange={e => {
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

      <EuiSpacer size="m" />
      <EuiSwitch
        data-test-subj="webhookViewHeadersSwitch"
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
        {hasHeaders && Object.keys(headers || {}).length > 0 ? (
          <Fragment>
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
          </Fragment>
        ) : null}
        <EuiSpacer size="m" />
        {headerControl}
        <EuiSpacer size="m" />
      </div>
    </Fragment>
  );
};

const WebhookParamsFields: React.FunctionComponent<ActionParamsProps<WebhookActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  const { body } = actionParams;

  return (
    <Fragment>
      <EuiFormRow
        id="webhookBody"
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.bodyFieldLabel',
          {
            defaultMessage: 'Body',
          }
        )}
        isInvalid={errors.body.length > 0 && body !== undefined}
        fullWidth
        error={errors.body}
      >
        <EuiCodeEditor
          fullWidth
          isInvalid={errors.body.length > 0 && body !== undefined}
          mode="json"
          width="100%"
          height="200px"
          theme="github"
          data-test-subj="webhookBodyEditor"
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.bodyCodeEditorAriaLabel',
            {
              defaultMessage: 'Code editor',
            }
          )}
          value={body || ''}
          onChange={(json: string) => {
            editAction('body', json, index);
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
