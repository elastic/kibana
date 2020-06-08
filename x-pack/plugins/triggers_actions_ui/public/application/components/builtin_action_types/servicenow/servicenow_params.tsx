/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect } from 'react';
import { EuiFormRow, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiSelect } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiFieldText } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { ActionParamsProps } from '../../../../types';
import { AddMessageVariables } from '../../add_message_variables';
import { ServiceNowActionParams } from './types';

const ServiceNowParamsFields: React.FunctionComponent<ActionParamsProps<
  ServiceNowActionParams
>> = ({ actionParams, editAction, index, errors, messageVariables }) => {
  const { title, description, comments, severity, urgency, impact } = actionParams;
  const selectOptions = [
    {
      value: '1',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.severitySelectCriticalOptionLabel',
        {
          defaultMessage: 'Hight',
        }
      ),
    },
    {
      value: '2',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.severitySelectErrorOptionLabel',
        {
          defaultMessage: 'Medium',
        }
      ),
    },
    {
      value: '3',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.pagerDutyAction.severitySelectWarningOptionLabel',
        {
          defaultMessage: 'Low',
        }
      ),
    },
  ];

  useEffect(() => {
    if (messageVariables?.find((variable) => variable === 'alertId')) {
      editAction('savedObjectId', '{{alertId}}', index);
    }
    if (!urgency) {
      editAction('urgency', '3', index);
    }
    if (!impact) {
      editAction('impact', '3', index);
    }
    if (!severity) {
      editAction('severity', '3', index);
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
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.urgencySelectFieldLabel',
          {
            defaultMessage: 'Urgency',
          }
        )}
      >
        <EuiSelect
          fullWidth
          data-test-subj="urgencySelect"
          options={selectOptions}
          value={urgency}
          onChange={(e) => {
            editAction('urgency', e.target.value, index);
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.severitySelectFieldLabel',
              {
                defaultMessage: 'Severity',
              }
            )}
          >
            <EuiSelect
              fullWidth
              data-test-subj="severitySelect"
              options={selectOptions}
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
              'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.impactSelectFieldLabel',
              {
                defaultMessage: 'Impact',
              }
            )}
          >
            <EuiSelect
              fullWidth
              data-test-subj="impactSelect"
              options={selectOptions}
              value={impact}
              onChange={(e) => {
                editAction('impact', e.target.value, index);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        error={errors.title}
        isInvalid={errors.title.length > 0 && title !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.titleFieldLabel',
          {
            defaultMessage: 'Short description',
          }
        )}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) => onSelectMessageVariable('title', variable)}
            paramsProperty="title"
          />
        }
      >
        <EuiFieldText
          fullWidth
          name="title"
          data-test-subj="titleInput"
          isInvalid={errors.title.length > 0 && title !== undefined}
          value={title || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction('title', e.target.value, index);
          }}
          onBlur={() => {
            if (!title) {
              editAction('title', '', index);
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        error={errors.description}
        isInvalid={errors.description.length > 0 && description !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.descriptionTextAreaFieldLabel',
          {
            defaultMessage: 'Description (optional)',
          }
        )}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) =>
              onSelectMessageVariable('description', variable)
            }
            paramsProperty="description"
          />
        }
      >
        <EuiTextArea
          fullWidth
          isInvalid={errors.description.length > 0 && description !== undefined}
          name="description"
          value={description || ''}
          data-test-subj="incidentDescriptionTextArea"
          onChange={(e) => {
            editAction('description', e.target.value, index);
          }}
          onBlur={() => {
            if (!description) {
              editAction('description', '', index);
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.commentsTextAreaFieldLabel',
          {
            defaultMessage: 'Comments (optional)',
          }
        )}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) =>
              onSelectMessageVariable('comments', variable)
            }
            paramsProperty="comments"
          />
        }
      >
        <EuiTextArea
          fullWidth
          name="comments"
          value={comments || ''}
          data-test-subj="incidentCommentTextArea"
          onChange={(e) => {
            editAction('comments', e.target.value, index);
          }}
          onBlur={() => {
            if (!comments) {
              editAction('comments', '', index);
            }
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowParamsFields as default };
