/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isUndefined } from 'lodash';
import { ActionParamsProps } from '../../../../types';
import { PagerDutyActionParams } from '../types';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';

const PagerDutyParamsFields: React.FunctionComponent<ActionParamsProps<PagerDutyActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const { eventAction, dedupKey, summary, source, severity, timestamp, component, group } =
    actionParams;
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

  const isDedupeKeyRequired = eventAction !== 'trigger';
  const isTriggerPagerDutyEvent = eventAction === 'trigger';

  const isDedupKeyInvalid: boolean = errors.dedupKey !== undefined && errors.dedupKey.length > 0;
  const isSummaryInvalid: boolean =
    errors.summary !== undefined && errors.summary.length > 0 && summary !== undefined;
  const isTimestampInvalid: boolean =
    errors.timestamp !== undefined && errors.timestamp.length > 0 && timestamp !== undefined;

  return (
    <>
      <EuiFlexGroup>
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
              hasNoInitialSelection={isUndefined(eventAction)}
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
            error={errors.dedupKey}
            isInvalid={isDedupKeyInvalid}
            label={
              isDedupeKeyRequired
                ? i18n.translate(
                    'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.dedupKeyTextRequiredFieldLabel',
                    {
                      defaultMessage: 'DedupKey',
                    }
                  )
                : i18n.translate(
                    'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.dedupKeyTextFieldLabel',
                    {
                      defaultMessage: 'DedupKey (optional)',
                    }
                  )
            }
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'dedupKey'}
              inputTargetValue={dedupKey}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isTriggerPagerDutyEvent ? (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            id="pagerDutySummary"
            fullWidth
            error={errors.summary}
            isInvalid={isSummaryInvalid}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.summaryFieldLabel',
              {
                defaultMessage: 'Summary',
              }
            )}
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'summary'}
              inputTargetValue={summary}
              errors={(errors.summary ?? []) as string[]}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.severitySelectFieldLabel',
                  {
                    defaultMessage: 'Severity (optional)',
                  }
                )}
              >
                <EuiSelect
                  fullWidth
                  data-test-subj="severitySelect"
                  options={severityOptions}
                  hasNoInitialSelection={isUndefined(severity)}
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
                error={errors.timestamp}
                isInvalid={isTimestampInvalid}
                label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.timestampTextFieldLabel',
                  {
                    defaultMessage: 'Timestamp (optional)',
                  }
                )}
              >
                <TextFieldWithMessageVariables
                  index={index}
                  editAction={editAction}
                  messageVariables={messageVariables}
                  paramsProperty={'timestamp'}
                  inputTargetValue={timestamp}
                  errors={errors.timestamp as string[]}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.componentTextFieldLabel',
              {
                defaultMessage: 'Component (optional)',
              }
            )}
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'component'}
              inputTargetValue={component}
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
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'group'}
              inputTargetValue={group}
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
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'source'}
              inputTargetValue={source}
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
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'class'}
              inputTargetValue={actionParams.class}
            />
          </EuiFormRow>
        </>
      ) : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { PagerDutyParamsFields as default };
