/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiIcon, EuiSuperSelect } from '@elastic/eui';
import styled from 'styled-components';

import { Connector } from '../../../../containers/case/configure/types';
import { connectorsConfiguration } from '../../../../lib/connectors/config';
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
`;

const noConnectorOption = {
  value: 'none',
  inputDisplay: (
    <>
      <EuiIconExtended type="minusInCircle" size={ICON_SIZE} />
      <span>{i18n.NO_CONNECTOR}</span>
    </>
  ),
  'data-test-subj': 'dropdown-connector-no-connector',
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
      connectors.reduce(
        (acc, connector) => [
          ...acc,
          {
            value: connector.id,
            inputDisplay: (
              <>
                <EuiIconExtended
                  type={connectorsConfiguration[connector.actionTypeId]?.logo ?? ''}
                  size={ICON_SIZE}
                />
                <span>{connector.name}</span>
              </>
            ),
            'data-test-subj': `dropdown-connector-${connector.id}`,
          },
        ],
        [noConnectorOption]
      ),
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
