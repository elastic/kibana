/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiComboBox,
  EuiTextArea,
  EuiButtonEmpty,
  EuiSwitch,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel,
  ActionConnectorFieldsProps,
  ValidationResult,
  ActionParamsProps,
} from '../../../types';
import { EmailActionParams, EmailActionConnector } from './types';
import { AddMessageVariables } from '../add_message_variables';

export function getActionType(): ActionTypeModel {
  const mailformat = /^[^@\s]+@[^@\s]+$/;
  return {
    id: '.email',
    iconClass: 'email',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.emailAction.selectMessageText',
      {
        defaultMessage: 'Send email from your server.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.emailAction.actionTypeTitle',
      {
        defaultMessage: 'Send to email',
      }
    ),
    validateConnector: (action: EmailActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        from: new Array<string>(),
        port: new Array<string>(),
        host: new Array<string>(),
        user: new Array<string>(),
        password: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.config.from) {
        errors.from.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredFromText',
            {
              defaultMessage: 'Sender is required.',
            }
          )
        );
      }
      if (action.config.from && !action.config.from.trim().match(mailformat)) {
        errors.from.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.formatFromText',
            {
              defaultMessage: 'Sender is not a valid email address.',
            }
          )
        );
      }
      if (!action.config.port) {
        errors.port.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredPortText',
            {
              defaultMessage: 'Port is required.',
            }
          )
        );
      }
      if (!action.config.host) {
        errors.host.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredHostText',
            {
              defaultMessage: 'Host is required.',
            }
          )
        );
      }
      if (action.secrets.user && !action.secrets.password) {
        errors.password.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredPasswordText',
            {
              defaultMessage: 'Password is required when username is used.',
            }
          )
        );
      }
      if (!action.secrets.user && action.secrets.password) {
        errors.user.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredUserText',
            {
              defaultMessage: 'Username is required when password is used.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (actionParams: EmailActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        to: new Array<string>(),
        cc: new Array<string>(),
        bcc: new Array<string>(),
        message: new Array<string>(),
        subject: new Array<string>(),
      };
      validationResult.errors = errors;
      if (
        (!(actionParams.to instanceof Array) || actionParams.to.length === 0) &&
        (!(actionParams.cc instanceof Array) || actionParams.cc.length === 0) &&
        (!(actionParams.bcc instanceof Array) || actionParams.bcc.length === 0)
      ) {
        const errorText = i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredEntryText',
          {
            defaultMessage: 'No To, Cc, or Bcc entry.  At least one entry is required.',
          }
        );
        errors.to.push(errorText);
        errors.cc.push(errorText);
        errors.bcc.push(errorText);
      }
      if (!actionParams.message?.length) {
        errors.message.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredMessageText',
            {
              defaultMessage: 'Message is required.',
            }
          )
        );
      }
      if (!actionParams.subject?.length) {
        errors.subject.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredSubjectText',
            {
              defaultMessage: 'Subject is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: EmailActionConnectorFields,
    actionParamsFields: EmailParamsFields,
  };
}

const EmailActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  EmailActionConnector
>> = ({ action, editActionConfig, editActionSecrets, errors }) => {
  const { from, host, port, secure } = action.config;
  const { user, password } = action.secrets;

  return (
    <Fragment>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="from"
            fullWidth
            error={errors.from}
            isInvalid={errors.from.length > 0 && from !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.fromTextFieldLabel',
              {
                defaultMessage: 'Sender',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              isInvalid={errors.from.length > 0 && from !== undefined}
              name="from"
              value={from || ''}
              data-test-subj="emailFromInput"
              onChange={(e) => {
                editActionConfig('from', e.target.value);
              }}
              onBlur={() => {
                if (!from) {
                  editActionConfig('from', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            id="emailHost"
            fullWidth
            error={errors.host}
            isInvalid={errors.host.length > 0 && host !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.hostTextFieldLabel',
              {
                defaultMessage: 'Host',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              isInvalid={errors.host.length > 0 && host !== undefined}
              name="host"
              value={host || ''}
              data-test-subj="emailHostInput"
              onChange={(e) => {
                editActionConfig('host', e.target.value);
              }}
              onBlur={() => {
                if (!host) {
                  editActionConfig('host', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFormRow
                id="emailPort"
                fullWidth
                placeholder="587"
                error={errors.port}
                isInvalid={errors.port.length > 0 && port !== undefined}
                label={i18n.translate(
                  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.portTextFieldLabel',
                  {
                    defaultMessage: 'Port',
                  }
                )}
              >
                <EuiFieldNumber
                  prepend=":"
                  isInvalid={errors.port.length > 0 && port !== undefined}
                  fullWidth
                  name="port"
                  value={port || ''}
                  data-test-subj="emailPortInput"
                  onChange={(e) => {
                    editActionConfig('port', parseInt(e.target.value, 10));
                  }}
                  onBlur={() => {
                    if (!port) {
                      editActionConfig('port', 0);
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiSwitch
                    label={i18n.translate(
                      'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.secureSwitchLabel',
                      {
                        defaultMessage: 'Secure',
                      }
                    )}
                    checked={secure || false}
                    onChange={(e) => {
                      editActionConfig('secure', e.target.checked);
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            id="emailUser"
            fullWidth
            error={errors.user}
            isInvalid={errors.user.length > 0}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.userTextFieldLabel',
              {
                defaultMessage: 'Username',
              }
            )}
          >
            <EuiFieldText
              fullWidth
              isInvalid={errors.user.length > 0}
              name="user"
              value={user || ''}
              data-test-subj="emailUserInput"
              onChange={(e) => {
                editActionSecrets('user', nullableString(e.target.value));
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="emailPassword"
            fullWidth
            error={errors.password}
            isInvalid={errors.password.length > 0}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.passwordFieldLabel',
              {
                defaultMessage: 'Password',
              }
            )}
          >
            <EuiFieldPassword
              fullWidth
              isInvalid={errors.password.length > 0}
              name="password"
              value={password || ''}
              data-test-subj="emailPasswordInput"
              onChange={(e) => {
                editActionSecrets('password', nullableString(e.target.value));
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};

const EmailParamsFields: React.FunctionComponent<ActionParamsProps<EmailActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  defaultMessage,
}) => {
  const { to, cc, bcc, subject, message } = actionParams;
  const toOptions = to ? to.map((label: string) => ({ label })) : [];
  const ccOptions = cc ? cc.map((label: string) => ({ label })) : [];
  const bccOptions = bcc ? bcc.map((label: string) => ({ label })) : [];
  const [addCC, setAddCC] = useState<boolean>(false);
  const [addBCC, setAddBCC] = useState<boolean>(false);

  useEffect(() => {
    if (!message && defaultMessage && defaultMessage.length > 0) {
      editAction('message', defaultMessage, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectMessageVariable = (paramsProperty: string, variable: string) => {
    editAction(
      paramsProperty,
      ((actionParams as any)[paramsProperty] ?? '').concat(` {{${variable}}}`),
      index
    );
  };

  return (
    <Fragment>
      <EuiFormRow
        fullWidth
        error={errors.to}
        isInvalid={errors.to.length > 0 && to !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientTextFieldLabel',
          {
            defaultMessage: 'To',
          }
        )}
        labelAppend={
          <Fragment>
            <span>
              {!addCC ? (
                <EuiButtonEmpty size="xs" onClick={() => setAddCC(true)}>
                  <FormattedMessage
                    defaultMessage="Add Cc"
                    id="xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.addCcButton"
                  />
                </EuiButtonEmpty>
              ) : null}
              {!addBCC ? (
                <EuiButtonEmpty size="xs" onClick={() => setAddBCC(true)}>
                  <FormattedMessage
                    defaultMessage="{titleBcc}"
                    id="xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.addBccButton"
                    values={{ titleBcc: !addCC ? '/ Bcc' : 'Add Bcc' }}
                  />
                </EuiButtonEmpty>
              ) : null}
            </span>
          </Fragment>
        }
      >
        <EuiComboBox
          noSuggestions
          isInvalid={errors.to.length > 0 && to !== undefined}
          fullWidth
          data-test-subj="toEmailAddressInput"
          selectedOptions={toOptions}
          onCreateOption={(searchValue: string) => {
            const newOptions = [...toOptions, { label: searchValue }];
            editAction(
              'to',
              newOptions.map((newOption) => newOption.label),
              index
            );
          }}
          onChange={(selectedOptions: Array<{ label: string }>) => {
            editAction(
              'to',
              selectedOptions.map((selectedOption) => selectedOption.label),
              index
            );
          }}
          onBlur={() => {
            if (!to) {
              editAction('to', [], index);
            }
          }}
        />
      </EuiFormRow>
      {addCC ? (
        <EuiFormRow
          fullWidth
          error={errors.cc}
          isInvalid={errors.cc.length > 0 && cc !== undefined}
          label={i18n.translate(
            'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientCopyTextFieldLabel',
            {
              defaultMessage: 'Cc',
            }
          )}
        >
          <EuiComboBox
            noSuggestions
            isInvalid={errors.cc.length > 0 && cc !== undefined}
            fullWidth
            data-test-subj="ccEmailAddressInput"
            selectedOptions={ccOptions}
            onCreateOption={(searchValue: string) => {
              const newOptions = [...ccOptions, { label: searchValue }];
              editAction(
                'cc',
                newOptions.map((newOption) => newOption.label),
                index
              );
            }}
            onChange={(selectedOptions: Array<{ label: string }>) => {
              editAction(
                'cc',
                selectedOptions.map((selectedOption) => selectedOption.label),
                index
              );
            }}
            onBlur={() => {
              if (!cc) {
                editAction('cc', [], index);
              }
            }}
          />
        </EuiFormRow>
      ) : null}
      {addBCC ? (
        <EuiFormRow
          fullWidth
          error={errors.bcc}
          isInvalid={errors.bcc.length > 0 && bcc !== undefined}
          label={i18n.translate(
            'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientBccTextFieldLabel',
            {
              defaultMessage: 'Bcc',
            }
          )}
        >
          <EuiComboBox
            noSuggestions
            isInvalid={errors.bcc.length > 0 && bcc !== undefined}
            fullWidth
            data-test-subj="bccEmailAddressInput"
            selectedOptions={bccOptions}
            onCreateOption={(searchValue: string) => {
              const newOptions = [...bccOptions, { label: searchValue }];
              editAction(
                'bcc',
                newOptions.map((newOption) => newOption.label),
                index
              );
            }}
            onChange={(selectedOptions: Array<{ label: string }>) => {
              editAction(
                'bcc',
                selectedOptions.map((selectedOption) => selectedOption.label),
                index
              );
            }}
            onBlur={() => {
              if (!bcc) {
                editAction('bcc', [], index);
              }
            }}
          />
        </EuiFormRow>
      ) : null}
      <EuiFormRow
        fullWidth
        error={errors.subject}
        isInvalid={errors.subject.length > 0 && subject !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.subjectTextFieldLabel',
          {
            defaultMessage: 'Subject',
          }
        )}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) =>
              onSelectMessageVariable('subject', variable)
            }
            paramsProperty="subject"
          />
        }
      >
        <EuiFieldText
          fullWidth
          isInvalid={errors.subject.length > 0 && subject !== undefined}
          name="subject"
          data-test-subj="emailSubjectInput"
          value={subject || ''}
          onChange={(e) => {
            editAction('subject', e.target.value, index);
          }}
          onBlur={() => {
            if (!subject) {
              editAction('subject', '', index);
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        error={errors.message}
        isInvalid={errors.message.length > 0 && message !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.messageTextAreaFieldLabel',
          {
            defaultMessage: 'Message',
          }
        )}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) =>
              onSelectMessageVariable('message', variable)
            }
            paramsProperty="message"
          />
        }
      >
        <EuiTextArea
          fullWidth
          isInvalid={errors.message.length > 0 && message !== undefined}
          value={message || ''}
          name="message"
          data-test-subj="emailMessageInput"
          onChange={(e) => {
            editAction('message', e.target.value, index);
          }}
          onBlur={() => {
            if (!message) {
              editAction('message', '', index);
            }
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};

// if the string == null or is empty, return null, else return string
function nullableString(str: string | null | undefined) {
  if (str == null || str.trim() === '') return null;
  return str;
}
