/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionParamsProps } from '../../../../types';
import { PagerDutyActionParams } from '.././types';
import { AddMessageVariables } from '../../add_message_variables';

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
      value: 'critical',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.severitySelectCriticalOptionLabel',
        {
          defaultMessage: 'Critical',
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
      value: 'info',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.severitySelectInfoOptionLabel',
        {
          defaultMessage: 'Info',
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
              onChange={(e) => {
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
              onChange={(e) => {
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

// eslint-disable-next-line import/no-default-export
export { PagerDutyParamsFields as default };
