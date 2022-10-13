/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { ActionConnector } from '../../../common/api';
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
import { useApplicationCapabilities } from '../../common/lib/kibana';
import * as i18n from '../../common/translations';

interface Props {
  connectors: ActionConnector[];
  isLoading: boolean;
  isLoadingConnectors: boolean;
}

interface ConnectorsFieldProps {
  connectors: ActionConnector[];
  field: FieldHook<FormProps['fields']>;
  isEdit: boolean;
  setErrors: (errors: boolean) => void;
}

const ConnectorFields = ({ connectors, isEdit, field, setErrors }: ConnectorsFieldProps) => {
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
ConnectorFields.displayName = 'ConnectorFields';

const ConnectorComponent: React.FC<Props> = ({ connectors, isLoading, isLoadingConnectors }) => {
  const { getFields, setFieldValue } = useFormContext();
  const { connector: configurationConnector } = useCaseConfigure();
  const { actions } = useApplicationCapabilities();

  const handleConnectorChange = useCallback(() => {
    const { fields } = getFields();
    fields.setValue(null);
  }, [getFields]);

  const defaultConnectorId = useMemo(() => {
    return connectors.some((connector) => connector.id === configurationConnector.id)
      ? configurationConnector.id
      : 'none';
  }, [configurationConnector.id, connectors]);

  useEffect(
    () => setFieldValue('connectorId', defaultConnectorId),
    [defaultConnectorId, setFieldValue]
  );

  const connectorIdConfig = getConnectorsFormValidators({
    config: schema.connectorId as FieldConfig,
    connectors,
  });

  if (!actions.read) {
    return (
      <EuiText data-test-subj="create-case-connector-permissions-error-msg" size="s">
        <span>{i18n.READ_ACTIONS_PERMISSIONS_ERROR_MSG}</span>
      </EuiText>
    );
  }

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
