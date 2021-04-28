/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import * as i18n from './translations';
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
  const isInit = useRef(true);
  const {
    subActionParams = {
      alertName: '',
      severity: '',
      alertSource: '',
      caseName: '',
      caseId: '',
      comments: '',
    },
  } = actionParams;

  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      const newProps = { ...subActionParams, [key]: value };
      editAction('subActionParams', newProps, index);
    },
    [subActionParams, editAction, index]
  );

  useEffect(() => {
    if (isInit.current) {
      isInit.current = false;
      editAction('subAction', 'createRecord', index);
    }
  }, [index, editAction]);

  return (
    <>
      <EuiFormRow
        id="swimlaneAlertName"
        fullWidth
        error={errors.alertName}
        isInvalid={errors.alertName.length > 0 && subActionParams?.alertName !== undefined}
        label={i18n.SW_ALERT_NAME_FIELD_LABEL}
      >
        <TextFieldWithMessageVariables
          index={index}
          data-test-subj="alertName"
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'alertName'}
          inputTargetValue={subActionParams.alertName || ''}
          errors={errors.alertName as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        id="swimlaneAlertSource"
        fullWidth
        error={errors.alertSource}
        isInvalid={errors.alertSource.length > 0 && subActionParams?.alertSource !== undefined}
        label={i18n.SW_ALERT_SOURCE_FIELD_LABEL}
      >
        <TextFieldWithMessageVariables
          index={index}
          data-test-subj="alertSource"
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'alertSource'}
          inputTargetValue={subActionParams.alertSource || ''}
          errors={errors.alertSource as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.SW_SEVERITY_FIELD_LABEL}>
            <TextFieldWithMessageVariables
              index={index}
              data-test-subj="severity"
              editAction={editSubActionProperty}
              messageVariables={messageVariables}
              paramsProperty={'severity'}
              inputTargetValue={subActionParams.severity || ''}
              errors={errors.severity as string[]}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow
        id="swimlaneCaseId"
        fullWidth
        error={errors.caseId}
        isInvalid={errors.caseId.length > 0 && subActionParams?.caseId !== undefined}
        label={i18n.SW_CASE_ID_FIELD_LABEL}
      >
        <TextFieldWithMessageVariables
          index={index}
          data-test-subj="caseId"
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'caseId'}
          inputTargetValue={subActionParams.caseId || ''}
          errors={errors.caseId as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        id="swimlaneCaseName"
        fullWidth
        error={errors.caseName}
        isInvalid={errors.caseName.length > 0 && subActionParams?.caseName !== undefined}
        label={i18n.SW_CASE_NAME_FIELD_LABEL}
      >
        <TextFieldWithMessageVariables
          index={index}
          data-test-subj="caseName"
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'caseName'}
          inputTargetValue={subActionParams.caseName || ''}
          errors={errors.caseName as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <TextAreaWithMessageVariables
        index={index}
        data-test-subj="comments"
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'comments'}
        inputTargetValue={subActionParams.comments || ''}
        errors={errors.comments as string[]}
        label={i18n.SW_COMMENTS_FIELD_LABEL}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { SwimlaneParamsFields as default };
