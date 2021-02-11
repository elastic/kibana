/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { UseField, useFormData, FieldHook, useFormContext } from '../../../shared_imports';
import { useConnectors } from '../../containers/configure/use_connectors';
import { ConnectorSelector } from '../connector_selector/form';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import { ActionConnector } from '../../containers/types';
import { getConnectorById } from '../configure_cases/utils';
import { FormProps } from './schema';

interface Props {
  isLoading: boolean;
}

interface ConnectorsFieldProps {
  connectors: ActionConnector[];
  field: FieldHook<FormProps['fields']>;
  isEdit: boolean;
}

const ConnectorFields = ({ connectors, isEdit, field }: ConnectorsFieldProps) => {
  const [{ connectorId }] = useFormData({ watch: ['connectorId'] });
  const { setValue } = field;
  const connector = getConnectorById(connectorId, connectors) ?? null;

  return (
    <ConnectorFieldsForm
      connector={connector}
      fields={field.value}
      isEdit={isEdit}
      onChange={setValue}
    />
  );
};

const ConnectorComponent: React.FC<Props> = ({ isLoading }) => {
  const { getFields } = useFormContext();
  const { loading: isLoadingConnectors, connectors } = useConnectors();
  const handleConnectorChange = useCallback(
    (newConnector) => {
      const { fields } = getFields();
      fields.setValue(null);
    },
    [getFields]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField
          path="connectorId"
          component={ConnectorSelector}
          componentProps={{
            connectors,
            handleChange: handleConnectorChange,
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
            isEdit: true,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ConnectorComponent.displayName = 'ConnectorComponent';

export const Connector = memo(ConnectorComponent);
