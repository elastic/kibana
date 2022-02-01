/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  label: i18n.NO_CONNECTOR,
  // inputDisplay: (
  // ),
  'data-test-subj': 'dropdown-connector-no-connector',
};

const addNewConnector = {
  value: 'add-connector',
  label: i18n.ADD_NEW_CONNECTOR,
  // inputDisplay: (
  // ),
  'data-test-subj': 'dropdown-connector-add-connector',
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

  const connectorsAsDropdownOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    const connectorsFormatted = connectors.reduce(
      (acc, connector) => {
        return [
          ...acc,
          {
            value: connector.id,
            label: connector.name,
            'data-test-subj': `dropdown-connector-${connector.id}`,
          },
        ];
      },
      [noConnectorOption]
    );

    if (appendAddConnectorButton) {
      return [...connectorsFormatted, addNewConnector];
    }

    return connectorsFormatted;
  }, [appendAddConnectorButton, connectors]);

  const [selected, setSelected] = useState<Array<EuiComboBoxOptionOption<string>>>([
    noConnectorOption,
  ]);

  useEffect(() => {
    if (selectedConnector !== selected[0].value) {
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
    if (option[0].value) {
      onChange(option[0].value);
    } else {
      onChange('');
    }
  };

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>) => {
      const connector = connectors.find((currentConnector) => currentConnector.id === option.value);
      if (option.value === 'add-connector') {
        return (
          <span className="euiButtonEmpty euiButtonEmpty--primary euiButtonEmpty--xSmall euiButtonEmpty--flushLeft">
            {i18n.ADD_NEW_CONNECTOR}
          </span>
        );
      }
      if (option.value === 'none') {
        return (
          <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIconExtended type="minusInCircle" size={ICON_SIZE} />
            </EuiFlexItem>
            <EuiFlexItem>
              <span data-test-subj={`dropdown-connector-no-connector`}>{i18n.NO_CONNECTOR}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }
      if (connector) {
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIconExtended
                type={getConnectorIcon(triggersActionsUi, connector.actionTypeId)}
                size={ICON_SIZE}
              />
            </EuiFlexItem>
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
        );
      }
    },
    [connectors, triggersActionsUi]
  );

  // const connectorsAsOptions = useMemo(() => {
  //   const connectorsFormatted = connectors.reduce(
  //     (acc, connector) => {
  //       return [
  //         ...acc,
  //         {
  //           value: connector.id,
  //           inputDisplay: (
  //             <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
  //               <EuiFlexItem grow={false}>
  //                 <EuiIconExtended
  //                   type={getConnectorIcon(triggersActionsUi, connector.actionTypeId)}
  //                   size={ICON_SIZE}
  //                 />
  //               </EuiFlexItem>
  //               <EuiFlexItem grow={false}>
  //                 <span>
  //                   {connector.name}
  //                   {isDeprecatedConnector(connector) && ` (${i18n.DEPRECATED_TOOLTIP_TEXT})`}
  //                 </span>
  //               </EuiFlexItem>
  //               {isDeprecatedConnector(connector) && (
  //                 <EuiFlexItem grow={false}>
  //                   <StyledEuiIconTip
  //                     aria-label={i18n.DEPRECATED_TOOLTIP_CONTENT}
  //                     size={ICON_SIZE}
  //                     type="alert"
  //                     color="warning"
  //                     content={i18n.DEPRECATED_TOOLTIP_CONTENT}
  //                   />
  //                 </EuiFlexItem>
  //               )}
  //             </EuiFlexGroup>
  //           ),
  //           'data-test-subj': `dropdown-connector-${connector.id}`,
  //         },
  //       ];
  //     },
  //     [noConnectorOption]
  //   );

  //   if (appendAddConnectorButton) {
  //     return [...connectorsFormatted, addNewConnector];
  //   }

  //   return connectorsFormatted;
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [connectors]);

  return (
    <EuiComboBox
      aria-label={i18n.INCIDENT_MANAGEMENT_SYSTEM_LABEL}
      data-test-subj="dropdown-connectors"
      isDisabled={disabled}
      fullWidth
      isLoading={isLoading}
      onChange={innerOnChange}
      singleSelection={{ asPlainText: true }}
      options={connectorsAsDropdownOptions}
      selectedOptions={selected}
      renderOption={renderOption}
    />
  );
};
// <EuiSuperSelect
//   aria-label={i18n.INCIDENT_MANAGEMENT_SYSTEM_LABEL}
//   data-test-subj="dropdown-connectors"
//   disabled={disabled}
//   fullWidth
//   isLoading={isLoading}
//   onChange={onChange}
//   options={connectorsAsOptions}
//   valueOfSelected={selectedConnector}
// />

ConnectorsDropdownComponent.displayName = 'ConnectorsDropdown';

export const ConnectorsDropdown = React.memo(ConnectorsDropdownComponent);
