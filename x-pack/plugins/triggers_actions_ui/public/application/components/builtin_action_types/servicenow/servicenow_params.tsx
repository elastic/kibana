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
import { EuiTitle } from '@elastic/eui';
import { ActionParamsProps } from '../../../../types';
import { AddMessageVariables } from '../../add_message_variables';
import { ServiceNowActionParams } from './types';

const ServiceNowParamsFields: React.FunctionComponent<ActionParamsProps<
  ServiceNowActionParams
>> = ({ actionParams, editAction, index, errors, messageVariables }) => {
  const { title, description, comment, severity, urgency, impact, savedObjectId } =
    actionParams.subActionParams || {};
  const selectOptions = [
    {
      value: '1',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.severitySelectHighOptionLabel',
        {
          defaultMessage: 'High',
        }
      ),
    },
    {
      value: '2',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.severitySelectMediumOptionLabel',
        {
          defaultMessage: 'Medium',
        }
      ),
    },
    {
      value: '3',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.severitySelectLawOptionLabel',
        {
          defaultMessage: 'Low',
        }
      ),
    },
  ];

  const editSubActionProperty = (key: string, value: {}) => {
    const newProps = { ...actionParams.subActionParams, [key]: value };
    editAction('subActionParams', newProps, index);
  };

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', 'pushToService', index);
    }
    if (!savedObjectId && messageVariables?.find((variable) => variable === 'alertId')) {
      editSubActionProperty('savedObjectId', '{{alertId}}');
    }
    if (!urgency) {
      editSubActionProperty('urgency', '3');
    }
    if (!impact) {
      editSubActionProperty('impact', '3');
    }
    if (!severity) {
      editSubActionProperty('severity', '3');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, comment, severity, impact, urgency]);

  const onSelectMessageVariable = (paramsProperty: string, variable: string) => {
    editSubActionProperty(
      paramsProperty,
      ((actionParams as any).subActionParams[paramsProperty] ?? '').concat(` {{${variable}}}`)
    );
  };

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>Incident</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
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
            editSubActionProperty('urgency', e.target.value);
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
                editSubActionProperty('severity', e.target.value);
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
                editSubActionProperty('impact', e.target.value);
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
            editSubActionProperty('title', e.target.value);
          }}
          onBlur={() => {
            if (!title) {
              editSubActionProperty('title', '');
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
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
          name="description"
          value={description || ''}
          data-test-subj="incidentDescriptionTextArea"
          onChange={(e) => {
            editSubActionProperty('description', e.target.value);
          }}
          onBlur={() => {
            if (!description) {
              editSubActionProperty('description', '');
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.commentsTextAreaFieldLabel',
          {
            defaultMessage: 'Additional comments (optional)',
          }
        )}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) =>
              onSelectMessageVariable('comment', variable)
            }
            paramsProperty="comment"
          />
        }
      >
        <EuiTextArea
          fullWidth
          name="comment"
          value={comment || ''}
          data-test-subj="incidentCommentTextArea"
          onChange={(e) => {
            editSubActionProperty('comment', e.target.value);
          }}
          onBlur={() => {
            if (!comment) {
              editSubActionProperty('comment', '');
            }
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowParamsFields as default };
