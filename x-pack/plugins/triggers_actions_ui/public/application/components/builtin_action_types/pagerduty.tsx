/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiLink,
  EuiContextMenuItem,
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenuPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  ActionTypeModel,
  ActionConnectorFieldsProps,
  ValidationResult,
  ActionParamsProps,
} from '../../../types';
import { PagerDutyActionParams, PagerDutyActionConnector } from './types';

export function getActionType(): ActionTypeModel {
  return {
    id: '.pagerduty',
    iconClass: 'apps',
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
              defaultMessage="Learn how to configure PagerDuty Accounts"
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
    { value: 'info', text: 'Info' },
    { value: 'critical', text: 'Critical' },
    { value: 'warning', text: 'Warning' },
    { value: 'error', text: 'Error' },
  ];
  const eventActionOptions = [
    { value: 'trigger', text: 'Trigger' },
    { value: 'resolve', text: 'Resolve' },
    { value: 'acknowledge', text: 'Acknowledge' },
  ];
  const [isVariablesPopoverOpen, setIsVariablesPopoverOpen] = useState<Record<string, boolean>>({
    dedupKey: false,
    summary: false,
    source: false,
    timestamp: false,
    component: false,
    group: false,
    class: false,
  });
  // TODO: replace this button with a proper Eui component, when it will be ready
  const getMessageVariables = (paramsProperty: string) =>
    messageVariables?.map((variable: string, i: number) => (
      <EuiContextMenuItem
        key={variable}
        icon="empty"
        onClick={() => {
          editAction(
            paramsProperty,
            ((actionParams as any)[paramsProperty] ?? '').concat(` {{${variable}}}`),
            index
          );
          setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, [paramsProperty]: false });
        }}
      >
        {`{{${variable}}}`}
      </EuiContextMenuItem>
    ));
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
              <EuiPopover
                button={
                  <EuiButtonIcon
                    data-test-subj="dedupKeyAddVariableButton"
                    onClick={() =>
                      setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, dedupKey: true })
                    }
                    iconType="indexOpen"
                    aria-label={i18n.translate(
                      'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.addVariablePopoverButton1',
                      {
                        defaultMessage: 'Add variable',
                      }
                    )}
                  />
                }
                isOpen={isVariablesPopoverOpen.dedupKey}
                closePopover={() =>
                  setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, dedupKey: false })
                }
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                <EuiContextMenuPanel items={getMessageVariables('dedupKey')} />
              </EuiPopover>
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
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.timestampTextFieldLabel',
              {
                defaultMessage: 'Timestamp (optional)',
              }
            )}
            labelAppend={
              <EuiPopover
                button={
                  <EuiButtonIcon
                    data-test-subj="timestampAddVariableButton"
                    onClick={() =>
                      setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, timestamp: true })
                    }
                    iconType="indexOpen"
                    aria-label={i18n.translate(
                      'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.addVariablePopoverButton2',
                      {
                        defaultMessage: 'Add variable',
                      }
                    )}
                  />
                }
                isOpen={isVariablesPopoverOpen.timestamp}
                closePopover={() =>
                  setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, timestamp: false })
                }
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                <EuiContextMenuPanel items={getMessageVariables('timestamp')} />
              </EuiPopover>
            }
          >
            <EuiFieldText
              fullWidth
              name="timestamp"
              data-test-subj="timestampInput"
              value={timestamp || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                editAction('timestamp', e.target.value, index);
              }}
              onBlur={() => {
                if (!timestamp) {
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
          <EuiPopover
            button={
              <EuiButtonIcon
                data-test-subj="componentAddVariableButton"
                onClick={() =>
                  setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, component: true })
                }
                iconType="indexOpen"
                aria-label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.addVariablePopoverButton3',
                  {
                    defaultMessage: 'Add variable',
                  }
                )}
              />
            }
            isOpen={isVariablesPopoverOpen.component}
            closePopover={() =>
              setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, component: false })
            }
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel items={getMessageVariables('component')} />
          </EuiPopover>
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
          <EuiPopover
            button={
              <EuiButtonIcon
                data-test-subj="groupAddVariableButton"
                onClick={() =>
                  setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, group: true })
                }
                iconType="indexOpen"
                aria-label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.addVariablePopoverButton4',
                  {
                    defaultMessage: 'Add variable',
                  }
                )}
              />
            }
            isOpen={isVariablesPopoverOpen.group}
            closePopover={() =>
              setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, group: false })
            }
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel items={getMessageVariables('group')} />
          </EuiPopover>
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
          <EuiPopover
            button={
              <EuiButtonIcon
                data-test-subj="sourceAddVariableButton"
                onClick={() =>
                  setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, source: true })
                }
                iconType="indexOpen"
                aria-label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.addVariablePopoverButton5',
                  {
                    defaultMessage: 'Add variable',
                  }
                )}
              />
            }
            isOpen={isVariablesPopoverOpen.source}
            closePopover={() =>
              setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, source: false })
            }
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel items={getMessageVariables('source')} />
          </EuiPopover>
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
          <EuiPopover
            button={
              <EuiButtonIcon
                data-test-subj="summaryAddVariableButton"
                onClick={() =>
                  setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, summary: true })
                }
                iconType="indexOpen"
                aria-label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.addVariablePopoverButton6',
                  {
                    defaultMessage: 'Add variable',
                  }
                )}
              />
            }
            isOpen={isVariablesPopoverOpen.summary}
            closePopover={() =>
              setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, summary: false })
            }
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel items={getMessageVariables('summary')} />
          </EuiPopover>
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
          <EuiPopover
            button={
              <EuiButtonIcon
                data-test-subj="classAddVariableButton"
                onClick={() =>
                  setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, class: true })
                }
                iconType="indexOpen"
                aria-label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.addVariablePopoverButton7',
                  {
                    defaultMessage: 'Add variable',
                  }
                )}
              />
            }
            isOpen={isVariablesPopoverOpen.class}
            closePopover={() =>
              setIsVariablesPopoverOpen({ ...isVariablesPopoverOpen, class: false })
            }
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel items={getMessageVariables('class')} />
          </EuiPopover>
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
