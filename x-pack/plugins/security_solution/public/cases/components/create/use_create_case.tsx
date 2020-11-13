/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, useMemo } from 'react';
import { FormHook, useForm } from '../../../shared_imports';
import { usePostCase } from '../../containers/use_post_case';
import { useConnectors } from '../../containers/configure/use_connectors';
import { ConnectorFields } from '../../../../../case/common/api/connectors';
import {
  getConnectorById,
  getNoneConnector,
  normalizeActionConnector,
} from '../configure_cases/utils';

import { schema, FormProps } from './schema';
import { Case } from '../../containers/types';

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: 'none',
};

interface UseCreateCaseReturn {
  form: FormHook<FormProps>;
  fields: ConnectorFields;
  onChangeFields: (fields: ConnectorFields) => void;
  isLoading: boolean;
  submitCase: () => Promise<void>;
  caseData: Case | null;
}

export const useCreateCase = (): UseCreateCaseReturn => {
  const { caseData, isLoading, postCase } = usePostCase();
  const { connectors } = useConnectors();
  const [fields, setFields] = useState<ConnectorFields>(null);
  const { form } = useForm<FormProps>({
    defaultValue: initialCaseValue,
    options: { stripEmptyFields: false },
    schema,
  });

  const submitCase = useCallback(async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      const { connectorId: dataConnectorId, ...dataWithoutConnectorId } = data;
      const caseConnector = getConnectorById(dataConnectorId, connectors);
      const connectorToUpdate = caseConnector
        ? normalizeActionConnector(caseConnector, fields)
        : getNoneConnector();

      await postCase({ ...dataWithoutConnectorId, connector: connectorToUpdate });
    }
  }, [postCase, fields, connectors, form]);

  const state = useMemo(
    () => ({
      submitCase,
      form,
      onChangeFields: setFields,
      fields,
      isLoading,
      caseData,
    }),
    [submitCase, form, fields, isLoading, caseData]
  );

  return state;
};
