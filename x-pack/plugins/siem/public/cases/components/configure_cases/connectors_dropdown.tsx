/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSuperSelect, EuiButtonEmpty } from '@elastic/eui';
import styled from 'styled-components';

import { Connector } from '../../containers/configure/types';
import { connectorsConfiguration } from '../../../common/lib/connectors/config';
import * as i18n from './translations';

export interface Props {
  connectors: Connector[];
  disabled: boolean;
  isLoading: boolean;
  onChange: (id: string) => void;
  selectedConnector: string;
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
    <EuiButtonEmpty size={'xs'} flush={'left'}>
      {i18n.ADD_NEW_CONNECTOR}
    </EuiButtonEmpty>
  ),
  'data-test-subj': 'dropdown-connector-add-connector',
};

const ConnectorsDropdownComponent: React.FC<Props> = ({
  connectors,
  disabled,
  isLoading,
  onChange,
  selectedConnector,
}) => {
  const connectorsAsOptions = useMemo(
    () =>
      connectors
        .reduce(
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
        )
        .concat([addNewConnector]),
    [connectors]
  );

  return (
    <EuiSuperSelect
      disabled={disabled}
      isLoading={isLoading}
      options={connectorsAsOptions}
      valueOfSelected={selectedConnector}
      fullWidth
      onChange={onChange}
      data-test-subj="dropdown-connectors"
    />
  );
};

export const ConnectorsDropdown = React.memo(ConnectorsDropdownComponent);
