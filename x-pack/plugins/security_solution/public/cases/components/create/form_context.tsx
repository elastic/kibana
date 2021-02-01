/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import { noop } from 'lodash/fp';
import { schema, FormProps } from './schema';
import { Form, useForm } from '../../../shared_imports';
import {
  getConnectorById,
  getNoneConnector,
  normalizeActionConnector,
} from '../configure_cases/utils';
import { usePostCase } from '../../containers/use_post_case';
import { usePostPushToService } from '../../containers/use_post_push_to_service';

import { useConnectors } from '../../containers/configure/use_connectors';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import { Case } from '../../containers/types';

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: 'none',
  fields: null,
  syncAlerts: true,
};

interface Props {
  onSuccess?: (theCase: Case) => void;
}

export const FormContext: React.FC<Props> = ({ children, onSuccess }) => {
  const { connectors } = useConnectors();
  const { connector: configurationConnector } = useCaseConfigure();
  const { postCase } = usePostCase();
  const { postPushToService } = usePostPushToService();

  const connectorId = useMemo(
    () =>
      connectors.some((connector) => connector.id === configurationConnector.id)
        ? configurationConnector.id
        : 'none',
    [configurationConnector.id, connectors]
  );

  const submitCase = useCallback(
    async (
      { connectorId: dataConnectorId, fields, syncAlerts, ...dataWithoutConnectorId },
      isValid
    ) => {
      if (isValid) {
        const caseConnector = getConnectorById(dataConnectorId, connectors);

        const connectorToUpdate = caseConnector
          ? normalizeActionConnector(caseConnector, fields)
          : getNoneConnector();

        const updatedCase = await postCase({
          ...dataWithoutConnectorId,
          connector: connectorToUpdate,
          settings: { syncAlerts },
        });

        if (updatedCase?.id && dataConnectorId !== 'none') {
          await postPushToService({
            caseId: updatedCase.id,
            caseServices: {},
            connector: connectorToUpdate,
            alerts: {},
            updateCase: noop,
          });
        }

        if (onSuccess && updatedCase) {
          onSuccess(updatedCase);
        }
      }
    },
    [connectors, postCase, onSuccess, postPushToService]
  );

  const { form } = useForm<FormProps>({
    defaultValue: initialCaseValue,
    options: { stripEmptyFields: false },
    schema,
    onSubmit: submitCase,
  });
  const { setFieldValue } = form;
  // Set the selected connector to the configuration connector
  useEffect(() => setFieldValue('connectorId', connectorId), [connectorId, setFieldValue]);

  return <Form form={form}>{children}</Form>;
};

FormContext.displayName = 'FormContext';
