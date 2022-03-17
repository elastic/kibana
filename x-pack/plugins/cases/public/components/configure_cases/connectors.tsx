/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

import { ActionConnector, CaseConnectorMapping } from '../../containers/configure/types';
import { Mapping } from './mapping';
import { ActionTypeConnector, ConnectorTypes } from '../../../common/api';
import { DeprecatedCallout } from '../connectors/deprecated_callout';
import { isDeprecatedConnector } from '../utils';

const EuiFormRowExtended = styled(EuiFormRow)`
  .euiFormRow__labelWrapper {
    .euiFormRow__label {
      width: 100%;
    }
  }
`;

export interface Props {
  actionTypes: ActionTypeConnector[];
  connectors: ActionConnector[];
  disabled: boolean;
  handleShowEditFlyout: () => void;
  isLoading: boolean;
  mappings: CaseConnectorMapping[];
  onChangeConnector: (id: string) => void;
  selectedConnector: { id: string; type: string };
  updateConnectorDisabled: boolean;
}
const ConnectorsComponent: React.FC<Props> = ({
  actionTypes,
  connectors,
  disabled,
  handleShowEditFlyout,
  isLoading,
  mappings,
  onChangeConnector,
  selectedConnector,
  updateConnectorDisabled,
}) => {
  const connector = useMemo(
    () => connectors.find((c) => c.id === selectedConnector.id),
    [connectors, selectedConnector.id]
  );

  const connectorsName = connector?.name ?? 'none';

  const actionTypeName = useMemo(
    () => actionTypes.find((c) => c.id === selectedConnector.type)?.name ?? 'Unknown',
    [actionTypes, selectedConnector.type]
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
    [connectorsName, handleShowEditFlyout, updateConnectorDisabled]
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
            {selectedConnector.type !== ConnectorTypes.none && isDeprecatedConnector(connector) && (
              <EuiFlexItem grow={false}>
                <DeprecatedCallout />
              </EuiFlexItem>
            )}
            {selectedConnector.type !== ConnectorTypes.none ? (
              <EuiFlexItem grow={false}>
                <Mapping
                  actionTypeName={actionTypeName}
                  isLoading={isLoading}
                  mappings={mappings}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFormRowExtended>
      </EuiDescribedFormGroup>
    </>
  );
};
ConnectorsComponent.displayName = 'Connectors';

export const Connectors = React.memo(ConnectorsComponent);
