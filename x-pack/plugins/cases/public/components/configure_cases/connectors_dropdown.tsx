/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
} from '@elastic/eui';
import styled from 'styled-components';

import { ActionConnector } from '../../containers/configure/types';
import * as i18n from './translations';
import { useKibana } from '../../common/lib/kibana';
import { getConnectorIcon, isDeprecatedConnector } from '../utils';
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';

type ConnectorEuiComboBoxOptionOption<T> = EuiComboBoxOptionOption<T> & {
  rendered: ReactNode;
};

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

const FlexItemIconContainer = styled(EuiFlexItem)`
  svg {
    margin-right: 13px;
    margin-bottom: 0 !important;
    width: 20px;
  }
`;

const noConnectorOption = {
  value: 'none',
  label: i18n.NO_CONNECTOR,
  'data-test-subj': 'dropdown-connector-no-connector',
  rendered: (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIconExtended type="minusInCircle" size={ICON_SIZE} />
      </EuiFlexItem>
      <EuiFlexItem>
        <span data-test-subj={`dropdown-connector-no-connector`}>{i18n.NO_CONNECTOR}</span>
      </EuiFlexItem>
    </EuiFlexGroup>
  ),
};

const addNewConnector = {
  value: 'add-connector',
  label: i18n.ADD_NEW_CONNECTOR,
  'data-test-subj': 'dropdown-connector-add-connector',
  render: (
    <span className="euiButtonEmpty euiButtonEmpty--primary euiButtonEmpty--xSmall euiButtonEmpty--flushLeft">
      {i18n.ADD_NEW_CONNECTOR}
    </span>
  ),
};

const StyledEuiIconTip = euiStyled(EuiIconTip)`
  margin-left: ${({ theme }) => theme.eui.euiSizeS}
  margin-bottom: 0 !important;
`;

const ConnectorsDropdownComponent: React.FC<Props> = ({
  connectors,
  disabled,
  isLoading,
  onChange,
  selectedConnector,
  appendAddConnectorButton = false,
}) => {
  const { triggersActionsUi } = useKibana().services;

  const getConnectorIconSuspended = useCallback(
    (connector: ActionConnector) => {
      const LazyIcon = getConnectorIcon(triggersActionsUi, connector.actionTypeId);
      return (
        <Suspense fallback="<span></span>">
          <LazyIcon />
        </Suspense>
      );
    },
    [triggersActionsUi]
  );

  const connectorsAsDropdownOptions: Array<ConnectorEuiComboBoxOptionOption<string>> =
    useMemo(() => {
      const connectorsFormatted = connectors.reduce(
        (acc, connector) => {
          return [
            ...acc,
            {
              value: connector.id,
              label: connector.name,
              'data-test-subj': `dropdown-connector-${connector.id}`,
              rendered: (
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <FlexItemIconContainer grow={false}>
                    <EuiIconExtended
                      type={() => getConnectorIconSuspended(connector)}
                      size={ICON_SIZE}
                    />
                  </FlexItemIconContainer>
                  <EuiFlexItem grow={false}>
                    <span>
                      {connector.name}
                      {isDeprecatedConnector(connector) && ` (${i18n.DEPRECATED_TOOLTIP_TEXT})`}
                    </span>
                  </EuiFlexItem>
                  {isDeprecatedConnector(connector) && (
                    <EuiFlexItem grow={false}>
                      <StyledEuiIconTip
                        aria-label={i18n.DEPRECATED_TOOLTIP_CONTENT}
                        size={ICON_SIZE}
                        type="alert"
                        color="warning"
                        content={i18n.DEPRECATED_TOOLTIP_CONTENT}
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              ),
            },
          ];
        },
        [noConnectorOption]
      );

      if (appendAddConnectorButton) {
        return [...connectorsFormatted, addNewConnector];
      }

      return connectorsFormatted;
    }, [appendAddConnectorButton, connectors, getConnectorIconSuspended]);

  const [selected, setSelected] = useState<Array<EuiComboBoxOptionOption<string>>>([
    noConnectorOption,
  ]);

  // handle the existing external selection
  useEffect(() => {
    if (selected?.length > 0 && selectedConnector !== selected[0].value) {
      const selectedOption = connectorsAsDropdownOptions.find(
        (connector) => connector.value === selectedConnector
      );
      if (selectedOption) {
        setSelected([selectedOption]);
      }
    }
  }, [connectorsAsDropdownOptions, selected, selectedConnector]);

  const innerOnChange = (option: Array<EuiComboBoxOptionOption<string>>) => {
    setSelected(option);
    if (option?.length > 0 && option[0].value) {
      onChange(option[0].value);
    }
  };

  // if the user leaves the combobox with an empty input
  // it will reset the one selected before or to no connector
  // if none was selected before
  const handleOnBlur = () => {
    if (selected?.length === 0) {
      const previousSelection = connectorsAsDropdownOptions.find(
        (connector) => connector.value === selectedConnector
      );
      if (previousSelection) {
        innerOnChange([previousSelection]);
      } else {
        innerOnChange([noConnectorOption]);
      }
    }
  };

  const renderOption = (option: EuiComboBoxOptionOption<string>, _searchString: string) => {
    return (option as ConnectorEuiComboBoxOptionOption<string>).rendered;
  };

  return (
    <EuiComboBox
      aria-label={i18n.INCIDENT_MANAGEMENT_SYSTEM_LABEL}
      data-test-subj="dropdown-connectors"
      isDisabled={disabled}
      renderOption={renderOption}
      fullWidth
      isLoading={isLoading}
      onChange={innerOnChange}
      singleSelection={{ asPlainText: true }}
      options={connectorsAsDropdownOptions}
      selectedOptions={selected}
      onBlur={handleOnBlur}
    />
  );
};

ConnectorsDropdownComponent.displayName = 'ConnectorsDropdown';

export const ConnectorsDropdown = React.memo(ConnectorsDropdownComponent);
