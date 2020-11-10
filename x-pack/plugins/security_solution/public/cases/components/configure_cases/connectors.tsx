/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
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

import { ActionConnector } from '../../containers/configure/types';
import { Mapping } from './mapping';
import { ConnectorTypes } from '../../../../../case/common/api/connectors';

const EuiFormRowExtended = styled(EuiFormRow)`
  .euiFormRow__labelWrapper {
    .euiFormRow__label {
      width: 100%;
    }
  }
`;

export interface Props {
  connectors: ActionConnector[];
  disabled: boolean;
  handleShowEditFlyout: () => void;
  isLoading: boolean;
  onChangeConnector: (id: string) => void;
  onClickUpdateMappings: () => void;
  selectedConnector: { id: string; type: string };
  updateConnectorDisabled: boolean;
}
const ConnectorsComponent: React.FC<Props> = ({
  connectors,
  disabled,
  handleShowEditFlyout,
  isLoading,
  onChangeConnector,
  onClickUpdateMappings,
  selectedConnector,
  updateConnectorDisabled,
}) => {
  const connectorsName = useMemo(
    () => connectors.find((c) => c.id === selectedConnector.id)?.name ?? 'none',
    [connectors, selectedConnector.id]
  );

  const dropDownLabel = useMemo(
    () => (
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>{i18n.INCIDENT_MANAGEMENT_SYSTEM_LABEL}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          {connectorsName !== 'none' && (
            <EuiLink
              disabled={updateConnectorDisabled}
              onClick={handleShowEditFlyout}
              data-test-subj="case-configure-update-selected-connector-button"
            >
              {i18n.UPDATE_SELECTED_CONNECTOR(connectorsName)}
            </EuiLink>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectorsName, updateConnectorDisabled]
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
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <ConnectorsDropdown
                connectors={connectors}
                disabled={disabled}
                selectedConnector={selectedConnector.id}
                isLoading={isLoading}
                onChange={onChangeConnector}
                data-test-subj="case-connectors-dropdown"
                appendAddConnectorButton={true}
              />
            </EuiFlexItem>
            {selectedConnector.type !== ConnectorTypes.none ? (
              <EuiFlexItem grow={false}>
                <Mapping
                  connectorActionTypeId={selectedConnector.type}
                  mapping={null}
                  updateFieldMappingsDisabled={updateConnectorDisabled}
                  setEditFlyoutVisibility={onClickUpdateMappings}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFormRowExtended>
      </EuiDescribedFormGroup>
    </>
  );
};

export const Connectors = React.memo(ConnectorsComponent);
