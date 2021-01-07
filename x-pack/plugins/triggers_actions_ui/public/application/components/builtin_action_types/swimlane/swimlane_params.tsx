/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionParamsProps } from '../../../../types';
import { SwimlaneActionParams } from '.././types';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';

const SwimlaneParamsFields: React.FunctionComponent<ActionParamsProps<SwimlaneActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const { alertName, severity, tags, comments } = actionParams;
  const severityOptions = [
    {
      value: 'critical',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.severitySelectCriticalOptionLabel',
        {
          defaultMessage: 'Critical',
        }
      ),
    },
    {
      value: 'high',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.severitySelectHighOptionLabel',
        {
          defaultMessage: 'High',
        }
      ),
    },
    {
      value: 'medium',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.severitySelectMediumOptionLabel',
        {
          defaultMessage: 'Medium',
        }
      ),
    },
    {
      value: 'low',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.severitySelectLowOptionLabel',
        {
          defaultMessage: 'Low',
        }
      ),
    },
    {
      value: 'informational',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.severitySelectInformationalOptionLabel',
        {
          defaultMessage: 'Informational',
        }
      ),
    },
  ];

  return (
    <Fragment>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.severitySelectFieldLabel',
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
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow
        id="swimlaneAlertName"
        fullWidth
        error={errors.alertName}
        isInvalid={errors.alertName.length > 0 && alertName !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.alertNameFieldLabel',
          {
            defaultMessage: 'Alert Name',
          }
        )}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editAction}
          messageVariables={messageVariables}
          paramsProperty={'alertName'}
          inputTargetValue={alertName}
          errors={errors.alertName as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        id="swimlaneTags"
        fullWidth
        error={errors.tags}
        isInvalid={errors.tags.length > 0 && tags !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.tagsFieldLabel',
          {
            defaultMessage: 'Tags',
          }
        )}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editAction}
          messageVariables={messageVariables}
          paramsProperty={'tags'}
          inputTargetValue={tags}
          // errors={errors.tags as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        id="swimlaneComments"
        fullWidth
        error={errors.comments}
        isInvalid={errors.comments.length > 0 && comments !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.commentsFieldLabel',
          {
            defaultMessage: 'Comments',
          }
        )}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editAction}
          messageVariables={messageVariables}
          paramsProperty={'comments'}
          inputTargetValue={comments}
          errors={errors.comments as string[]}
        />
      </EuiFormRow>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { SwimlaneParamsFields as default };
