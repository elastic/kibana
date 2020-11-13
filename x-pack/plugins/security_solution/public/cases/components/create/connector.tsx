/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ConnectorFields } from '../../../../../case/common/api/connectors';
import { UseField, useFormData } from '../../../shared_imports';
import { ConnectorSelector } from '../connector_selector/form';
import { SettingFieldsForm } from '../settings/fields_form';
import { ActionConnector } from '../../containers/types';
import {
  normalizeCaseConnector,
  getConnectorById,
  getNoneConnector,
  normalizeActionConnector,
} from '../configure_cases/utils';

interface Props {
  isLoading: boolean;
  currentConnectorId: string | null;
  connectors: ActionConnector[];
}

const SettingsField = ({ currentConnectorId, connectors, isEdit, field }) => {
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

const ConnectorComponent: React.FC<Props> = ({ isLoading, connectors, currentConnectorId }) => (
  <EuiFlexGroup>
    <EuiFlexItem>
      <UseField
        path="connectorId"
        component={ConnectorSelector}
        componentProps={{
          connectors,
          dataTestSubj: 'caseConnectors',
          defaultValue: currentConnectorId,
          disabled: isLoading,
          idAria: 'caseConnectors',
          isLoading,
        }}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <UseField
        path="fields"
        component={SettingsField}
        componentProps={{
          currentConnectorId,
          connectors,
          isEdit: true,
        }}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const Connector = memo(ConnectorComponent);
