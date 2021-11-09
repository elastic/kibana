/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ConnectorTypes, ActionConnector } from '../../../common';
import {
  UseField,
  useFormData,
  FieldHook,
  useFormContext,
  FieldConfig,
} from '../../common/shared_imports';
import { ConnectorSelector } from '../connector_selector/form';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import { FormProps, schema } from './schema';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import { getConnectorById, getConnectorsFormValidators } from '../utils';

interface Props {
  connectors: ActionConnector[];
  isLoading: boolean;
  isLoadingConnectors: boolean;
  hideConnectorServiceNowSir?: boolean;
}

interface ConnectorsFieldProps {
  connectors: ActionConnector[];
  field: FieldHook<FormProps['fields']>;
  isEdit: boolean;
  setErrors: (errors: boolean) => void;
  hideConnectorServiceNowSir?: boolean;
}

const ConnectorFields = ({
  connectors,
  isEdit,
  field,
  setErrors,
  hideConnectorServiceNowSir = false,
}: ConnectorsFieldProps) => {
  const [{ connectorId }] = useFormData({ watch: ['connectorId'] });
  const { setValue } = field;
  let connector = getConnectorById(connectorId, connectors) ?? null;

  if (
    connector &&
    hideConnectorServiceNowSir &&
    connector.actionTypeId === ConnectorTypes.serviceNowSIR
  ) {
    connector = null;
  }
  return (
    <ConnectorFieldsForm
      connector={connector}
      fields={field.value}
      isEdit={isEdit}
      onChange={setValue}
    />
  );
};

const ConnectorComponent: React.FC<Props> = ({
  connectors,
  hideConnectorServiceNowSir = false,
  isLoading,
  isLoadingConnectors,
}) => {
  const { getFields, setFieldValue } = useFormContext();
  const { connector: configurationConnector } = useCaseConfigure();

  const handleConnectorChange = useCallback(() => {
    const { fields } = getFields();
    fields.setValue(null);
  }, [getFields]);

  const defaultConnectorId = useMemo(() => {
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

  useEffect(
    () => setFieldValue('connectorId', defaultConnectorId),
    [defaultConnectorId, setFieldValue]
  );

  const connectorIdConfig = getConnectorsFormValidators({
    config: schema.connectorId as FieldConfig,
    connectors,
  });

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField
          path="connectorId"
          config={connectorIdConfig}
          component={ConnectorSelector}
          defaultValue={defaultConnectorId}
          componentProps={{
            connectors,
            handleChange: handleConnectorChange,
            hideConnectorServiceNowSir,
            dataTestSubj: 'caseConnectors',
            disabled: isLoading || isLoadingConnectors,
            idAria: 'caseConnectors',
            isLoading: isLoading || isLoadingConnectors,
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <UseField
          path="fields"
          component={ConnectorFields}
          componentProps={{
            connectors,
            hideConnectorServiceNowSir,
            isEdit: true,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ConnectorComponent.displayName = 'ConnectorComponent';

export const Connector = memo(ConnectorComponent);
