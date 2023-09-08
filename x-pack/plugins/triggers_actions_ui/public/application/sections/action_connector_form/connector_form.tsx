/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { isEmpty } from 'lodash';
import {
  Form,
  FormHook,
  useForm,
  useFormIsModified,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiSpacer } from '@elastic/eui';
import { ActionTypeModel, ConnectorValidationFunc } from '../../../types';
import { ConnectorFormFields } from './connector_form_fields';
import { ConnectorFormSchema } from './types';
import { EncryptedFieldsCallout } from './encrypted_fields_callout';

export interface ConnectorFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  isSubmitting: boolean;
  submit: FormHook<ConnectorFormSchema>['submit'];
  preSubmitValidator: ConnectorValidationFunc | null;
}

export type ResetForm = (
  options?:
    | {
        resetValues?: boolean | undefined;
        defaultValue?:
          | Partial<ConnectorFormSchema<Record<string, unknown>, Record<string, unknown>>>
          | undefined;
      }
    | undefined
) => void;
interface Props {
  actionTypeModel: ActionTypeModel | null;
  connector: ConnectorFormSchema & { isMissingSecrets: boolean };
  isEdit: boolean;
  /** Handler to receive state changes updates */
  onChange?: (state: ConnectorFormState) => void;
  /** Handler to receive update on the form "isModified" state */
  onFormModifiedChange?: (isModified: boolean) => void;
  setResetForm?: (value: ResetForm) => void;
}
/**
 * The serializer and deserializer are needed to transform the headers of
 * the webhook connectors. The webhook connector uses the UseArray component
 * to add dynamic headers to the form. The UseArray component formats the fields
 * as an array of objects. The schema for the headers of the webhook connector
 * is Record<string, string>. We need to transform the UseArray format to the one
 * accepted by the backend. At the moment, the UseArray does not accepts
 * a serializer and deserializer so it has to be done on the form level. When issue #133107
 * is resolved we should move the serializer and deserializer functions to the
 * webhook connector.
 */

// TODO: Remove when https://github.com/elastic/kibana/issues/133107 is resolved
const formDeserializer = (data: ConnectorFormSchema): ConnectorFormSchema => {
  if (data.actionTypeId !== '.webhook' && data.actionTypeId !== '.cases-webhook') {
    return data;
  }

  const webhookData = data as { config: { headers?: Record<string, string> } };
  const headers = Object.entries(webhookData?.config?.headers ?? {}).map(([key, value]) => ({
    key,
    value,
  }));

  return {
    ...data,
    config: {
      ...data.config,
      headers: isEmpty(headers) ? undefined : headers,
    },
  };
};

// TODO: Remove when https://github.com/elastic/kibana/issues/133107 is resolved
const formSerializer = (formData: ConnectorFormSchema): ConnectorFormSchema => {
  if (formData.actionTypeId !== '.webhook' && formData.actionTypeId !== '.cases-webhook') {
    return formData;
  }

  const webhookFormData = formData as {
    config: { headers?: Array<{ key: string; value: string }> };
  };
  const headers = (webhookFormData?.config?.headers ?? []).reduce(
    (acc, header) => ({
      ...acc,
      [header.key]: header.value,
    }),
    {}
  );

  return {
    ...formData,
    config: {
      ...formData.config,
      headers: isEmpty(headers) ? null : headers,
    },
  };
};

const ConnectorFormComponent: React.FC<Props> = ({
  actionTypeModel,
  connector,
  isEdit,
  onChange,
  onFormModifiedChange,
  setResetForm,
}) => {
  const { form } = useForm({
    defaultValue: connector,
    serializer: formSerializer,
    deserializer: formDeserializer,
  });
  const { submit, isValid: isFormValid, isSubmitted, isSubmitting, reset } = form;
  const [preSubmitValidator, setPreSubmitValidator] = useState<ConnectorValidationFunc | null>(
    null
  );

  const registerPreSubmitValidator = useCallback((validator: ConnectorValidationFunc) => {
    setPreSubmitValidator(() => validator);
  }, []);

  const isFormModified = useFormIsModified({
    form,
    discard: ['__internal__'],
  });

  useEffect(() => {
    if (onChange) {
      onChange({ isValid: isFormValid, isSubmitted, isSubmitting, submit, preSubmitValidator });
    }
  }, [onChange, isFormValid, isSubmitted, isSubmitting, submit, preSubmitValidator]);

  useEffect(() => {
    if (onFormModifiedChange) {
      onFormModifiedChange(isFormModified);
    }
  }, [isFormModified, onFormModifiedChange]);

  useEffect(() => {
    if (setResetForm) {
      setResetForm(reset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  return (
    <Form form={form}>
      <ConnectorFormFields
        actionTypeModel={actionTypeModel}
        isEdit={isEdit}
        registerPreSubmitValidator={registerPreSubmitValidator}
      />
      <EuiSpacer size="m" />
      <EncryptedFieldsCallout isEdit={isEdit} isMissingSecrets={connector.isMissingSecrets} />
    </Form>
  );
};

export const ConnectorForm = React.memo(ConnectorFormComponent);
