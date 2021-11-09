/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { EuiFormRow, EuiSpacer, EuiTitle, EuiSelect } from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';
import { ActionParamsProps } from '../../../../types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';

import * as i18n from './translations';
import { useChoices } from './use_choices';
import { ServiceNowITOMActionParams } from './types';
import { choicesToEuiOptions, isFieldInvalid } from './helpers';

const choicesFields = ['severity'];

const fields: Array<{
  label: string;
  fieldKey: keyof ServiceNowITOMActionParams['subActionParams'];
}> = [
  { label: i18n.SOURCE, fieldKey: 'source' },
  { label: i18n.NODE, fieldKey: 'node' },
  { label: i18n.TYPE, fieldKey: 'type' },
  { label: i18n.RESOURCE, fieldKey: 'resource' },
  { label: i18n.METRIC_NAME, fieldKey: 'metric_name' },
  { label: i18n.EVENT_CLASS, fieldKey: 'event_class' },
  { label: i18n.MESSAGE_KEY, fieldKey: 'message_key' },
];

const additionalInformation = JSON.stringify({
  alert: {
    id: '{{alert.id}}',
    actionGroup: '{{alert.actionGroup}}',
    actionSubgroup: '{{alert.actionSubgroup}}',
    actionGroupName: '{{alert.actionGroupName}}',
  },
  rule: {
    id: '{{rule.id}}',
    name: '{{rule.name}}',
    type: '{{rule.type}}',
  },
  date: '{{date}}',
});

const ServiceNowITOMParamsFields: React.FunctionComponent<
  ActionParamsProps<ServiceNowITOMActionParams>
> = ({ actionConnector, actionParams, editAction, index, messageVariables, errors }) => {
  const params = useMemo(
    () => (actionParams.subActionParams ?? {}) as ServiceNowITOMActionParams['subActionParams'],
    [actionParams.subActionParams]
  );

  const { description, severity } = params;

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const actionConnectorRef = useRef(actionConnector?.id ?? '');
  const { choices, isLoading: isLoadingChoices } = useChoices({
    http,
    toastNotifications: toasts,
    actionConnector,
    fields: choicesFields,
  });

  const severityOptions = useMemo(() => choicesToEuiOptions(choices.severity), [choices.severity]);

  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      editAction('subActionParams', { ...params, [key]: value }, index);
    },
    [editAction, index, params]
  );

  useEffect(() => {
    if (actionConnector != null && actionConnectorRef.current !== actionConnector.id) {
      actionConnectorRef.current = actionConnector.id;
      editAction(
        'subActionParams',
        { additional_info: additionalInformation, message_key: '{{rule.id}}:{{alert.id}}' },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector]);

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', 'addEvent', index);
    }

    if (!actionParams.subActionParams) {
      editAction(
        'subActionParams',
        { additional_info: additionalInformation, message_key: '{{rule.id}}:{{alert.id}}' },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

  return (
    <>
      <EuiTitle size="s">
        <h3>{i18n.EVENT}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {fields.map((field) => (
        <React.Fragment key={field.fieldKey}>
          <EuiFormRow fullWidth label={field.label}>
            <TextFieldWithMessageVariables
              index={index}
              editAction={editSubActionProperty}
              messageVariables={messageVariables}
              paramsProperty={field.fieldKey}
              inputTargetValue={params[field.fieldKey] ?? undefined}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
        </React.Fragment>
      ))}
      <EuiFormRow
        fullWidth
        label={i18n.SEVERITY_REQUIRED_LABEL}
        error={errors.severity}
        isInvalid={isFieldInvalid(severity, errors.severity)}
      >
        <EuiSelect
          fullWidth
          hasNoInitialSelection
          data-test-subj="severitySelect"
          isLoading={isLoadingChoices}
          disabled={isLoadingChoices}
          options={severityOptions}
          value={severity ?? ''}
          onChange={(e) => editSubActionProperty('severity', e.target.value)}
          isInvalid={isFieldInvalid(severity, errors.severity)}
        />
      </EuiFormRow>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        inputTargetValue={description ?? undefined}
        label={i18n.DESCRIPTION_LABEL}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowITOMParamsFields as default };
