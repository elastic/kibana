/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { UseField } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/components/use_field';
import { useFormContext } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/form_context';
import { useFormData } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form_data';
import type {
  FieldConfig,
  FieldHook,
} from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/types';
import type { ActionConnector } from '../../../common/api/connectors';
import { ConnectorTypes } from '../../../common/api/connectors';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import { ConnectorSelector } from '../connector_selector/form';
import { getConnectorById, getConnectorsFormValidators } from '../utils';
import type { FormProps } from './schema';
import { schema } from './schema';

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

  useEffect(() => setFieldValue('connectorId', defaultConnectorId), [
    defaultConnectorId,
    setFieldValue,
  ]);

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
