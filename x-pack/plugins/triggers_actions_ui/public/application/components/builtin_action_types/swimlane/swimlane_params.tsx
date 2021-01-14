/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionParamsProps } from '../../../../types';
import { SwimlaneActionParams } from '../types';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';

const SwimlaneParamsFields: React.FunctionComponent<ActionParamsProps<SwimlaneActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const { alertName, severity, caseId, alertSource, caseName, comments } = actionParams;

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
            <TextFieldWithMessageVariables
              index={index}
              data-test-subj="severity"
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'severity'}
              inputTargetValue={severity}
              errors={errors.severity as string[]}
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
          data-test-subj="alertName"
          editAction={editAction}
          messageVariables={messageVariables}
          paramsProperty={'alertName'}
          inputTargetValue={alertName}
          errors={errors.alertName as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        id="swimlaneCaseId"
        fullWidth
        error={errors.caseId}
        isInvalid={errors.caseId.length > 0 && caseId !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.caseIdFieldLabel',
          {
            defaultMessage: 'CaseId',
          }
        )}
      >
        <TextFieldWithMessageVariables
          index={index}
          data-test-subj="caseId"
          editAction={editAction}
          messageVariables={messageVariables}
          paramsProperty={'caseId'}
          inputTargetValue={caseId}
          errors={errors.caseId as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        id="swimlaneCaseName"
        fullWidth
        error={errors.caseName}
        isInvalid={errors.caseName.length > 0 && caseName !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.caseNameFieldLabel',
          {
            defaultMessage: 'Case Name',
          }
        )}
      >
        <TextFieldWithMessageVariables
          index={index}
          data-test-subj="caseName"
          editAction={editAction}
          messageVariables={messageVariables}
          paramsProperty={'caseName'}
          inputTargetValue={caseName}
          errors={errors.caseName as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        id="swimlaneAlertSource"
        fullWidth
        error={errors.alertSource}
        isInvalid={errors.alertSource.length > 0 && alertSource !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.alertSourceFieldLabel',
          {
            defaultMessage: 'Alert Source',
          }
        )}
      >
        <TextFieldWithMessageVariables
          index={index}
          data-test-subj="alertSource"
          editAction={editAction}
          messageVariables={messageVariables}
          paramsProperty={'alertSource'}
          inputTargetValue={alertSource}
          errors={errors.alertSource as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <TextAreaWithMessageVariables
        index={index}
        data-test-subj="comments"
        editAction={editAction}
        messageVariables={messageVariables}
        paramsProperty={'comments'}
        inputTargetValue={comments}
        errors={errors.comments as string[]}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.commentsFieldLabel',
          {
            defaultMessage: 'Comments',
          }
        )}
      />
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { SwimlaneParamsFields as default };
