/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import {
  ActionTypeModel,
  ActionConnectorFieldsProps,
  ValidationResult,
  ActionParamsProps,
} from '../../../types';
import { PagerDutyActionParams, PagerDutyActionConnector } from './types';
import pagerDutySvg from './pagerduty.svg';
import { AddMessageVariables } from '../add_message_variables';
import { hasMustacheTokens } from '../../lib/has_mustache_tokens';

export function getActionType(): ActionTypeModel {
  return {
    id: '.pagerduty',
    iconClass: pagerDutySvg,
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.selectMessageText',
      {
        defaultMessage: 'Send an event in PagerDuty.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.actionTypeTitle',
      {
        defaultMessage: 'Send to PagerDuty',
      }
    ),
    validateConnector: (action: PagerDutyActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        routingKey: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.secrets.routingKey) {
        errors.routingKey.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.error.requiredRoutingKeyText',
            {
              defaultMessage: 'A routing key is required.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (actionParams: PagerDutyActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        summary: new Array<string>(),
        timestamp: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!actionParams.summary?.length) {
        errors.summary.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.error.requiredSummaryText',
            {
              defaultMessage: 'Summary is required.',
            }
          )
        );
      }
      if (actionParams.timestamp && !hasMustacheTokens(actionParams.timestamp)) {
        if (isNaN(Date.parse(actionParams.timestamp))) {
          const { nowShortFormat, nowLongFormat } = getValidTimestampExamples();
          errors.timestamp.push(
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.error.invalidTimestamp',
              {
                defaultMessage:
                  'Timestamp must be a valid date, such as {nowShortFormat} or {nowLongFormat}.',
                values: {
                  nowShortFormat,
                  nowLongFormat,
                },
              }
            )
          );
        }
      }
      return validationResult;
    },
    actionConnectorFields: PagerDutyActionConnectorFields,
    actionParamsFields: PagerDutyParamsFields,
  };
}

const PagerDutyActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps<
  PagerDutyActionConnector
>> = ({ errors, action, editActionConfig, editActionSecrets }) => {
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
            defaultMessage: 'API URL',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="apiUrl"
          value={apiUrl || ''}
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
            href="https://www.elastic.co/guide/en/elasticsearch/reference/current/actions-pagerduty.html#configuring-pagerduty"
            target="_blank"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.routingKeyNameHelpLabel"
              defaultMessage="Configure a PagerDuty account."
            />
          </EuiLink>
        }
        error={errors.routingKey}
        isInvalid={errors.routingKey.length > 0 && routingKey !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.routingKeyTextFieldLabel',
          {
            defaultMessage: 'Routing key',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          isInvalid={errors.routingKey.length > 0 && routingKey !== undefined}
          name="routingKey"
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
      </EuiFormRow>
    </Fragment>
  );
};

const PagerDutyParamsFields: React.FunctionComponent<ActionParamsProps<PagerDutyActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const {
    eventAction,
    dedupKey,
    summary,
    source,
    severity,
    timestamp,
    component,
    group,
  } = actionParams;
  const severityOptions = [
    {
      value: 'info',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.severitySelectInfoOptionLabel',
        {
          defaultMessage: 'Info',
        }
      ),
    },
    {
      value: 'critical',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.severitySelectCriticalOptionLabel',
        {
          defaultMessage: 'Critical',
        }
      ),
    },
    {
      value: 'warning',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.severitySelectWarningOptionLabel',
        {
          defaultMessage: 'Warning',
        }
      ),
    },
    {
      value: 'error',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.severitySelectErrorOptionLabel',
        {
          defaultMessage: 'Error',
        }
      ),
    },
  ];
  const eventActionOptions = [
    {
      value: 'trigger',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.eventSelectTriggerOptionLabel',
        {
          defaultMessage: 'Trigger',
        }
      ),
    },
    {
      value: 'resolve',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.eventSelectResolveOptionLabel',
        {
          defaultMessage: 'Resolve',
        }
      ),
    },
    {
      value: 'acknowledge',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.eventSelectAcknowledgeOptionLabel',
        {
          defaultMessage: 'Acknowledge',
        }
      ),
    },
  ];

  const onSelectMessageVariable = (paramsProperty: string, variable: string) => {
    editAction(
      paramsProperty,
      ((actionParams as any)[paramsProperty] ?? '').concat(` {{${variable}}}`),
      index
    );
  };

  return (
    <Fragment>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.severitySelectFieldLabel',
              {
                defaultMessage: 'Severity',
              }
            )}
          >
            <EuiSelect
              fullWidth
              data-test-subj="severitySelect"
              options={severityOptions}
              value={severity}
              onChange={e => {
                editAction('severity', e.target.value, index);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.eventActionSelectFieldLabel',
              {
                defaultMessage: 'Event action',
              }
            )}
          >
            <EuiSelect
              fullWidth
              data-test-subj="eventActionSelect"
              options={eventActionOptions}
              value={eventAction}
              onChange={e => {
                editAction('eventAction', e.target.value, index);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.dedupKeyTextFieldLabel',
              {
                defaultMessage: 'DedupKey (optional)',
              }
            )}
            labelAppend={
              <AddMessageVariables
                messageVariables={messageVariables}
                onSelectEventHandler={(variable: string) =>
                  onSelectMessageVariable('dedupKey', variable)
                }
                paramsProperty="dedupKey"
              />
            }
          >
            <EuiFieldText
              fullWidth
              name="dedupKey"
              data-test-subj="dedupKeyInput"
              value={dedupKey || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                editAction('dedupKey', e.target.value, index);
              }}
              onBlur={() => {
                if (!dedupKey) {
                  editAction('dedupKey', '', index);
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            error={errors.timestamp}
            isInvalid={errors.timestamp.length > 0 && timestamp !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.timestampTextFieldLabel',
              {
                defaultMessage: 'Timestamp (optional)',
              }
            )}
            labelAppend={
              <AddMessageVariables
                messageVariables={messageVariables}
                onSelectEventHandler={(variable: string) =>
                  onSelectMessageVariable('timestamp', variable)
                }
                paramsProperty="timestamp"
              />
            }
          >
            <EuiFieldText
              fullWidth
              name="timestamp"
              data-test-subj="timestampInput"
              value={timestamp || ''}
              isInvalid={errors.timestamp.length > 0 && timestamp !== undefined}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                editAction('timestamp', e.target.value, index);
              }}
              onBlur={() => {
                if (timestamp?.trim()) {
                  editAction('timestamp', timestamp.trim(), index);
                } else {
                  editAction('timestamp', '', index);
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.componentTextFieldLabel',
          {
            defaultMessage: 'Component (optional)',
          }
        )}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) =>
              onSelectMessageVariable('component', variable)
            }
            paramsProperty="component"
          />
        }
      >
        <EuiFieldText
          fullWidth
          name="component"
          data-test-subj="componentInput"
          value={component || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction('component', e.target.value, index);
          }}
          onBlur={() => {
            if (!component) {
              editAction('component', '', index);
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.groupTextFieldLabel',
          {
            defaultMessage: 'Group (optional)',
          }
        )}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) => onSelectMessageVariable('group', variable)}
            paramsProperty="group"
          />
        }
      >
        <EuiFieldText
          fullWidth
          name="group"
          data-test-subj="groupInput"
          value={group || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction('group', e.target.value, index);
          }}
          onBlur={() => {
            if (!group) {
              editAction('group', '', index);
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.sourceTextFieldLabel',
          {
            defaultMessage: 'Source (optional)',
          }
        )}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) => onSelectMessageVariable('source', variable)}
            paramsProperty="source"
          />
        }
      >
        <EuiFieldText
          fullWidth
          name="source"
          data-test-subj="sourceInput"
          value={source || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction('source', e.target.value, index);
          }}
          onBlur={() => {
            if (!source) {
              editAction('source', '', index);
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="pagerDutySummary"
        fullWidth
        error={errors.summary}
        isInvalid={errors.summary.length > 0 && summary !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.summaryFieldLabel',
          {
            defaultMessage: 'Summary',
          }
        )}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) =>
              onSelectMessageVariable('summary', variable)
            }
            paramsProperty="summary"
          />
        }
      >
        <EuiFieldText
          fullWidth
          isInvalid={errors.summary.length > 0 && summary !== undefined}
          name="summary"
          value={summary || ''}
          data-test-subj="pagerdutySummaryInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction('summary', e.target.value, index);
          }}
          onBlur={() => {
            if (!summary) {
              editAction('summary', '', index);
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="pagerDutyClass"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.classFieldLabel',
          {
            defaultMessage: 'Class (optional)',
          }
        )}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) => onSelectMessageVariable('class', variable)}
            paramsProperty="class"
          />
        }
      >
        <EuiFieldText
          fullWidth
          name="class"
          value={actionParams.class || ''}
          data-test-subj="pagerdutyClassInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction('class', e.target.value, index);
          }}
          onBlur={() => {
            if (!actionParams.class) {
              editAction('class', '', index);
            }
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};

function getValidTimestampExamples() {
  const now = moment();
  return {
    nowShortFormat: now.format('YYYY-MM-DD'),
    nowLongFormat: now.format('YYYY-MM-DD h:mm:ss'),
  };
}
