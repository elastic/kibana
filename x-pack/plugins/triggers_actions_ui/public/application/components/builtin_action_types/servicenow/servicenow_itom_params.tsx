/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { EuiFormRow, EuiSpacer, EuiTitle, EuiSwitch } from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';
import { ActionParamsProps } from '../../../../types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';

import * as i18n from './translations';
import { useGetChoices } from './use_get_choices';
import { Choice, Fields, ServiceNowITOMActionParams } from './types';
import { choicesToEuiOptions } from './helpers';

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

const ServiceNowITOMParamsFields: React.FunctionComponent<
  ActionParamsProps<ServiceNowITOMActionParams>
> = ({ actionConnector, actionParams, editAction, index, messageVariables }) => {
  const params = useMemo(
    () => (actionParams.subActionParams ?? {}) as ServiceNowITOMActionParams['subActionParams'],
    [actionParams.subActionParams]
  );

  const { description } = params;

  const actionConnectorRef = useRef(actionConnector?.id ?? '');

  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      editAction('subActionParams', { ...params, [key]: value }, index);
    },
    [editAction, index, params]
  );

  useEffect(() => {
    if (actionConnector != null && actionConnectorRef.current !== actionConnector.id) {
      actionConnectorRef.current = actionConnector.id;
      editAction('subActionParams', {}, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector]);

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', 'addEvent', index);
    }

    if (!actionParams.subActionParams) {
      editAction('subActionParams', {}, index);
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
        <>
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
        </>
      ))}
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
