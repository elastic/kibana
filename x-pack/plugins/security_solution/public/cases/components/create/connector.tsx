/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ConnectorFields } from '../../../../../case/common/api/connectors';
import { UseField } from '../../../shared_imports';
import { ConnectorSelector } from '../connector_selector/form';
import { SettingFieldsForm } from '../settings/fields_form';
import { ActionConnector } from '../../containers/types';

interface Props {
  isLoading: boolean;
  currentConnectorId: string | null;
  connectors: ActionConnector[];
  connector: ActionConnector | null;
  fields: ConnectorFields;
  onChangeFields: (fields: ConnectorFields) => void;
  onChangeConnector: (id: string) => void;
}

const ConnectorComponent: React.FC<Props> = ({
  isLoading,
  connectors,
  connector,
  currentConnectorId,
  onChangeConnector,
  fields,
  onChangeFields,
}) => (
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
        onChange={onChangeConnector}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <SettingFieldsForm
        connector={connector}
        fields={fields}
        isEdit={true}
        onChange={onChangeFields}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const Connector = memo(ConnectorComponent);
