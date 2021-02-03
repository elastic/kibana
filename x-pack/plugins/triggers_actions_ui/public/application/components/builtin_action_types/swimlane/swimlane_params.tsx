/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import * as i18n2 from './translations';
import { ActionParamsProps } from '../../../../types';
import { SwimlaneActionParams } from './types';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { useKibana } from '../../../../common/lib/kibana';
import { getApplication } from './api';

const SwimlaneParamsFields: React.FunctionComponent<ActionParamsProps<SwimlaneActionParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const { alertName, severity, caseId, alertSource, caseName, comments } = actionParams;
  const { config } = actionConnector as PreCo;
  const { appId } = config;
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [isLoading, setLoading] = useState(false);
  const [options, setOptions] = useState([] as Array<{ label: string; value: string }>);

  const abortCtrl = useRef(new AbortController());

  const onSearchChange = useCallback(
    (searchValue) => {
      setLoading(true);
      setOptions([]);

      const didCancel = false;

      const fetchData = async () => {
        // if (!apiToken || !apiUrl || !appId) {
        //   setLoading(false);
        //   return;
        // }

        abortCtrl.current = new AbortController();
        setLoading(true);

        try {
          const res = await getApplication({
            http,
            signal: abortCtrl.current.signal,
            connectorId: actionConnector.id || '',
            id: appId,
          });
          if (!didCancel) {
            setLoading(false);
            const application = res.data?.application;
            if (application?.fields) {
              const applicationFields = application.fields;
              const fieldMap = applicationFields.map((f: { id: string; key: string }) => ({
                value: f.id,
                label: f.key,
              }));
              setOptions(fieldMap);
            }
            if (res.status && res.status === 'error') {
              toasts.addDanger({
                title: i18n2.SW_GET_APPLICATION_API_ERROR(appId),
                text: `${res.serviceMessage ?? res.message}`,
              });
            }
          }
        } catch (error) {
          if (!didCancel) {
            setLoading(false);
            toasts.addDanger({
              title: i18n2.SW_GET_APPLICATION_API_ERROR(appId),
              text: error.message,
            });
          }
        }
      };

      abortCtrl.current.abort();
      fetchData();
    },
    [toasts, actionConnector, appId, http]
  );

  useEffect(() => {
    // Simulate initial load.
    onSearchChange('');
  }, [onSearchChange]);

  return (
    <Fragment>
      <EuiFormRow
        id="caseNameKeyName"
        fullWidth
        label={i18n2.SW_CASE_NAME_KEY_NAME_TEXT_FIELD_LABEL}
      >
        <EuiComboBox
          fullWidth
          isLoading={isLoading}
          isDisabled={isLoading}
          // name="caseNameKeyName"
          // value={mappings.caseNameKeyName.fieldKey}
          options={options}
          singleSelection={true}
          // readOnly={readOnly}
          // required={false}
          data-test-subj="swimlaneCaseNameKeyNameInput"
          onSearchChange={onSearchChange}
          // onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          //   editMappings('caseNameKeyName', e.target.value);
          // }}
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
