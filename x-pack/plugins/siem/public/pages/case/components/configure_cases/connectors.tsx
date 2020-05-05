/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';

import styled from 'styled-components';

import { ConnectorsDropdown } from './connectors_dropdown';
import * as i18n from './translations';

import { Connector } from '../../../../containers/case/configure/types';

const EuiFormRowExtended = styled(EuiFormRow)`
  .euiFormRow__labelWrapper {
    .euiFormRow__label {
      width: 100%;
    }
  }
`;

export interface Props {
  connectors: Connector[];
  disabled: boolean;
  isLoading: boolean;
  onChangeConnector: (id: string) => void;
  selectedConnector: string;
  handleShowAddFlyout: () => void;
}
const ConnectorsComponent: React.FC<Props> = ({
  connectors,
  disabled,
  isLoading,
  onChangeConnector,
  selectedConnector,
  handleShowAddFlyout,
}) => {
  const dropDownLabel = (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>{i18n.INCIDENT_MANAGEMENT_SYSTEM_LABEL}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink
          disabled={disabled}
          onClick={handleShowAddFlyout}
          data-test-subj="case-configure-add-connector-button"
        >
          {i18n.ADD_NEW_CONNECTOR}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      <EuiDescribedFormGroup
        fullWidth
        title={<h3>{i18n.INCIDENT_MANAGEMENT_SYSTEM_TITLE}</h3>}
        description={i18n.INCIDENT_MANAGEMENT_SYSTEM_DESC}
        data-test-subj="case-connectors-form-group"
      >
        <EuiFormRowExtended
          fullWidth
          label={dropDownLabel}
          data-test-subj="case-connectors-form-row"
        >
          <ConnectorsDropdown
            connectors={connectors}
            disabled={disabled}
            selectedConnector={selectedConnector}
            isLoading={isLoading}
            onChange={onChangeConnector}
            data-test-subj="case-connectors-dropdown"
          />
        </EuiFormRowExtended>
      </EuiDescribedFormGroup>
    </>
  );
};

export const Connectors = React.memo(ConnectorsComponent);
