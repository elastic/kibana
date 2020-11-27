/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ConnectorTypeFields } from '../../../../../case/common/api/connectors';
import { UseField, useFormData, FieldHook } from '../../../shared_imports';
import { useConnectors } from '../../containers/configure/use_connectors';
import { ConnectorSelector } from '../connector_selector/form';
import { SettingFieldsForm } from '../settings/fields_form';
import { ActionConnector } from '../../containers/types';
import { getConnectorById } from '../configure_cases/utils';

interface Props {
  isLoading: boolean;
}

interface SettingsFieldProps {
  connectors: ActionConnector[];
  field: FieldHook<ConnectorTypeFields['fields']>;
  isEdit: boolean;
}

const SettingsField = ({ connectors, isEdit, field }: SettingsFieldProps) => {
  const [{ connectorId }] = useFormData({ watch: ['connectorId'] });
  const { setValue } = field;
  const connector = getConnectorById(connectorId, connectors) ?? null;

  useEffect(() => {
    if (connectorId) {
      setValue(null);
    }
  }, [setValue, connectorId]);

  return (
    <SettingFieldsForm
      connector={connector}
      fields={field.value}
      isEdit={isEdit}
      onChange={setValue}
    />
  );
};

const ConnectorComponent: React.FC<Props> = ({ isLoading }) => {
  const { loading: isLoadingConnectors, connectors } = useConnectors();

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField
          path="connectorId"
          component={ConnectorSelector}
          componentProps={{
            connectors,
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
          component={SettingsField}
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
