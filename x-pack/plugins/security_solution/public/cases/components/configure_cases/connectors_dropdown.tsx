/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSuperSelect } from '@elastic/eui';
import styled from 'styled-components';

import { ActionConnector } from '../../containers/configure/types';
import { connectorsConfiguration } from '../connectors';
import * as i18n from './translations';

export interface Props {
  connectors: ActionConnector[];
  disabled: boolean;
  isLoading: boolean;
  onChange: (id: string) => void;
  selectedConnector: string;
  appendAddConnectorButton?: boolean;
}

const ICON_SIZE = 'm';

const EuiIconExtended = styled(EuiIcon)`
  margin-right: 13px;
  margin-bottom: 0 !important;
`;

const noConnectorOption = {
  value: 'none',
  inputDisplay: (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIconExtended type="minusInCircle" size={ICON_SIZE} />
      </EuiFlexItem>
      <EuiFlexItem>
        <span data-test-subj={`dropdown-connector-no-connector`}>{i18n.NO_CONNECTOR}</span>
      </EuiFlexItem>
    </EuiFlexGroup>
  ),
  'data-test-subj': 'dropdown-connector-no-connector',
};

const addNewConnector = {
  value: 'add-connector',
  inputDisplay: (
    <span className="euiButtonEmpty euiButtonEmpty--primary euiButtonEmpty--xSmall euiButtonEmpty--flushLeft">
      {i18n.ADD_NEW_CONNECTOR}
    </span>
  ),
  'data-test-subj': 'dropdown-connector-add-connector',
};

const ConnectorsDropdownComponent: React.FC<Props> = ({
  connectors,
  disabled,
  isLoading,
  onChange,
  selectedConnector,
  appendAddConnectorButton = false,
}) => {
  const connectorsAsOptions = useMemo(() => {
    const connectorsFormatted = connectors.reduce(
      (acc, connector) => [
        ...acc,
        {
          value: connector.id,
          inputDisplay: (
            <EuiFlexGroup gutterSize="none" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIconExtended
                  type={connectorsConfiguration[connector.actionTypeId]?.logo ?? ''}
                  size={ICON_SIZE}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <span>{connector.name}</span>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          'data-test-subj': `dropdown-connector-${connector.id}`,
        },
      ],
      [noConnectorOption]
    );

    if (appendAddConnectorButton) {
      return [...connectorsFormatted, addNewConnector];
    }

    return connectorsFormatted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectors]);

  return (
    <EuiSuperSelect
      aria-label={i18n.INCIDENT_MANAGEMENT_SYSTEM_LABEL}
      data-test-subj="dropdown-connectors"
      disabled={disabled}
      fullWidth
      isLoading={isLoading}
      onChange={onChange}
      options={connectorsAsOptions}
      valueOfSelected={selectedConnector}
    />
  );
};

export const ConnectorsDropdown = React.memo(ConnectorsDropdownComponent);
