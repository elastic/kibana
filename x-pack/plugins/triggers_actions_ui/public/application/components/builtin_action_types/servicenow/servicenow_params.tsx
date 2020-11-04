/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiFormControlLayout,
  EuiIconTip,
} from '@elastic/eui';
import { isSome } from 'fp-ts/lib/Option';
import { ActionParamsProps } from '../../../../types';
import { ServiceNowActionParams } from './types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';
import { extractActionVariable } from '../extract_action_variable';

const ServiceNowParamsFields: React.FunctionComponent<ActionParamsProps<
  ServiceNowActionParams
>> = ({ actionParams, editAction, index, errors, messageVariables }) => {
  const { title, description, comment, severity, urgency, impact, savedObjectId } =
    actionParams.subActionParams || {};

  const isActionBeingConfiguredByAnAlert = messageVariables
    ? isSome(extractActionVariable(messageVariables, 'alertId'))
    : false;

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
    if (!savedObjectId && isActionBeingConfiguredByAnAlert) {
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

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>
          {i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.title',
            {
              defaultMessage: 'Incident',
            }
          )}
        </h3>
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
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'title'}
          inputTargetValue={title}
          errors={errors.title as string[]}
        />
      </EuiFormRow>
      {!isActionBeingConfiguredByAnAlert && (
        <Fragment>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.savedObjectIdFieldLabel',
              {
                defaultMessage: 'Object ID (optional)',
              }
            )}
          >
            <EuiFormControlLayout
              fullWidth
              append={
                <EuiIconTip
                  content={i18n.translate(
                    'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.savedObjectIdFieldHelp',
                    {
                      defaultMessage:
                        'ServiceNow will associate this action with the ID of a Kibana saved object.',
                    }
                  )}
                />
              }
            >
              <TextFieldWithMessageVariables
                index={index}
                editAction={editSubActionProperty}
                messageVariables={messageVariables}
                paramsProperty={'savedObjectId'}
                inputTargetValue={savedObjectId}
              />
            </EuiFormControlLayout>
          </EuiFormRow>
          <EuiSpacer size="m" />
        </Fragment>
      )}
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        inputTargetValue={description}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.descriptionTextAreaFieldLabel',
          {
            defaultMessage: 'Description (optional)',
          }
        )}
        errors={errors.description as string[]}
      />
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'comment'}
        inputTargetValue={comment}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.commentsTextAreaFieldLabel',
          {
            defaultMessage: 'Additional comments (optional)',
          }
        )}
        errors={errors.comment as string[]}
      />
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowParamsFields as default };
