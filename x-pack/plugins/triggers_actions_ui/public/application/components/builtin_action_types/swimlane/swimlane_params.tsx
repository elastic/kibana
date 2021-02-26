/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import * as i18n2 from './translations';
import { ActionParamsProps } from '../../../../types';
import { SwimlaneActionParams } from './types';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';

const SwimlaneParamsFields: React.FunctionComponent<ActionParamsProps<SwimlaneActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const { subActionParams } = actionParams;

  const [state, setState] = useState({ ...subActionParams });

  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      const newProps = { ...state, [key]: value };
      editAction('subActionParams', newProps, index);
      setState(newProps);
    },
    [state, editAction, setState, index]
  );

  return (
    <Fragment>
      <EuiFormRow id="caseNameKeyName" fullWidth label={i18n2.SW_CASE_NAME_FIELD_LABEL}>
        <TextFieldWithMessageVariables
          index={index}
          data-test-subj="caseName"
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'caseName'}
          inputTargetValue={state.alertName}
          errors={errors.alertName as string[]}
        />
      </EuiFormRow>

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
              editAction={editSubActionProperty}
              messageVariables={messageVariables}
              paramsProperty={'severity'}
              inputTargetValue={state.severity}
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
        isInvalid={errors.alertName.length > 0 && state?.alertName !== undefined}
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
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'alertName'}
          inputTargetValue={state.alertName}
          errors={errors.alertName as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        id="swimlaneCaseId"
        fullWidth
        error={errors.caseId}
        isInvalid={errors.caseId.length > 0 && state?.caseId !== undefined}
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
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'caseId'}
          inputTargetValue={state.caseId || ''}
          errors={errors.caseId as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        id="swimlaneCaseName"
        fullWidth
        error={errors.caseName}
        isInvalid={errors.caseName.length > 0 && state?.caseName !== undefined}
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
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'caseName'}
          inputTargetValue={state.caseName || ''}
          errors={errors.caseName as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        id="swimlaneAlertSource"
        fullWidth
        error={errors.alertSource}
        isInvalid={errors.alertSource.length > 0 && state?.alertSource !== undefined}
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
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'alertSource'}
          inputTargetValue={state.alertSource}
          errors={errors.alertSource as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <TextAreaWithMessageVariables
        index={index}
        data-test-subj="comments"
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'comments'}
        inputTargetValue={state.comments || ''}
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
