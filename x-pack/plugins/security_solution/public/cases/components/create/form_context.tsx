/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
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
import { CaseType, ConnectorTypes } from '../../../../../cases/common/api';

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: 'none',
  fields: null,
  syncAlerts: true,
};

interface Props {
  afterCaseCreated?: (theCase: Case) => Promise<void>;
  caseType?: CaseType;
  hideConnectorServiceNowSir?: boolean;
  onSuccess?: (theCase: Case) => Promise<void>;
}

export const FormContext: React.FC<Props> = ({
  afterCaseCreated,
  caseType = CaseType.individual,
  children,
  hideConnectorServiceNowSir,
  onSuccess,
}) => {
  const { connectors } = useConnectors();
  const { connector: configurationConnector } = useCaseConfigure();
  const { postCase } = usePostCase();
  const { pushCaseToExternalService } = usePostPushToService();

  const connectorId = useMemo(() => {
    if (
      hideConnectorServiceNowSir &&
      configurationConnector.type === ConnectorTypes.serviceNowSIR
    ) {
      return 'none';
    }
    return connectors.some((connector) => connector.id === configurationConnector.id)
      ? configurationConnector.id
      : 'none';
  }, [
    configurationConnector.id,
    configurationConnector.type,
    connectors,
    hideConnectorServiceNowSir,
  ]);

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
          type: caseType,
          connector: connectorToUpdate,
          settings: { syncAlerts },
        });

        if (afterCaseCreated && updatedCase) {
          await afterCaseCreated(updatedCase);
        }

        if (updatedCase?.id && dataConnectorId !== 'none') {
          await pushCaseToExternalService({
            caseId: updatedCase.id,
            connector: connectorToUpdate,
          });
        }

        if (onSuccess && updatedCase) {
          await onSuccess(updatedCase);
        }
      }
    },
    [caseType, connectors, postCase, onSuccess, pushCaseToExternalService, afterCaseCreated]
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
