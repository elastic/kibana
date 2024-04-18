/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiForm,
  EuiFormLabel,
  EuiIcon,
  EuiSuperSelect,
} from '@elastic/eui';
import { useConnectorTypes } from '../../hooks/api/use_connector_types';

interface EditServiceTypeProps {
  serviceType: string | null;
  setServiceType: (serviceType: string) => void;
}

export const EditServiceType: React.FC<EditServiceTypeProps> = ({
  serviceType,
  setServiceType,
}) => {
  const connectorTypes = useConnectorTypes();

  const options =
    connectorTypes.map((connectorType) => ({
      inputDisplay: (
        <EuiFlexGroup direction="row" alignItems="center">
          <EuiFlexItem
            grow={false}
            data-test-subj={`serverlessSearchConnectorServiceType-${connectorType.serviceType}`}
          >
            <EuiIcon
              size="l"
              title={connectorType.name}
              id={connectorType.serviceType}
              type={connectorType.iconPath}
            />
          </EuiFlexItem>
          <EuiFlexItem>{connectorType.name}</EuiFlexItem>
        </EuiFlexGroup>
      ),
      value: connectorType.serviceType,
    })) || [];

  return (
    <EuiForm>
      <EuiFormLabel data-test-subj="serverlessSearchEditConnectorTypeLabel">
        {i18n.translate('xpack.serverlessSearch.connectors.serviceTypeLabel', {
          defaultMessage: 'Connector type',
        })}
      </EuiFormLabel>
      <EuiSuperSelect
        data-test-subj="serverlessSearchEditConnectorTypeChoices"
        onChange={(event) => setServiceType(event)}
        options={options}
        valueOfSelected={serviceType || undefined}
      />
    </EuiForm>
  );
};
