/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';

import { schema, FormProps } from './schema';
import { Form, useForm, useFormData } from '../../../shared_imports';
import {
  normalizeCaseConnector,
  getConnectorById,
  getNoneConnector,
  normalizeActionConnector,
} from '../configure_cases/utils';
import { usePostCase } from '../../containers/use_post_case';
import { useConnectors } from '../../containers/configure/use_connectors';

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: 'none',
};

export const FormContext = ({ children, onSuccess }) => {
  const { loading: isLoadingConnectors, connectors } = useConnectors();
  const { caseData, isLoading, postCase } = usePostCase();

  const submitCase = useCallback(
    async ({ connectorId: dataConnectorId, fields, ...dataWithoutConnectorId }, isValid) => {
      console.error('submitCase', fields);
      if (isValid) {
        const caseConnector = getConnectorById(dataConnectorId, connectors);
        const connectorToUpdate = caseConnector
          ? normalizeActionConnector(caseConnector, fields)
          : getNoneConnector();

        await postCase({ ...dataWithoutConnectorId, connector: connectorToUpdate });
      }
    },
    [postCase, connectors]
  );

  const { form } = useForm<FormProps>({
    defaultValue: initialCaseValue,
    options: { stripEmptyFields: false },
    schema,
    onSubmit: submitCase,
  });

  // useEffect(() => {
  //   const subscription = form.subscribe(async ({ isValid, validate, data }) => {
  //     console.error('formData', data);
  //     // const isFormValid = isValid ?? (await validate());
  //     // if (isFormValid) {
  //     //   setFormData(data.format() as Pipeline);
  //     // }
  //   });

  //   return subscription.unsubscribe;
  // }, [form]);

  useEffect(() => {
    if (caseData) {
      onSuccess(caseData);
    }
  }, [caseData, onSuccess]);

  return <Form form={form}>{children}</Form>;
};

FormContext.displayName = 'FormContext';
