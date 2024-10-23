/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiFlexItem,
  EuiIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import connectorLogo from '../../../../../../assets/images/connector.svg';
import { KibanaLogic } from '../../../../../shared/kibana';
import { NewConnectorLogic } from '../../../new_index/method_connector/new_connector_logic';
import { SelfManagePreference } from '../create_connector';

interface ChooseConnectorSelectableProps {
  selfManaged: SelfManagePreference;
}
interface OptionData {
  secondaryContent?: string;
}

export const ChooseConnectorSelectable: React.FC<ChooseConnectorSelectableProps> = ({
  selfManaged,
}) => {
  const { euiTheme } = useEuiTheme();
  const [selectedOption, setSelectedOption] = useState<Array<EuiComboBoxOptionOption<OptionData>>>(
    []
  );
  const renderOption = (
    option: EuiComboBoxOptionOption<OptionData>,
    searchValue: string,
    contentClassName: string
  ) => {
    const { _append, key, label, _prepend } = option as EuiComboBoxOptionOption<OptionData> & {
      _append: JSX.Element[];
      _prepend: JSX.Element;
    };
    return (
      <EuiFlexGroup
        gutterSize="m"
        key={key + '-span'}
        justifyContent="spaceBetween"
        className={contentClassName}
      >
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem grow={false}>{_prepend}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" textAlign="left">
              {label}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>{_append}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };
  const [selectableOptions, selectableSetOptions] = useState<
    Array<EuiComboBoxOptionOption<OptionData>>
  >([]);
  const { connectorTypes } = useValues(KibanaLogic);
  const allConnectors = useMemo(
    () => connectorTypes.sort((a, b) => a.name.localeCompare(b.name)),
    [connectorTypes]
  );
  const { selectedConnector } = useValues(NewConnectorLogic);
  const { setSelectedConnector } = useActions(NewConnectorLogic);

  const getInitialOptions = () => {
    return allConnectors.map((connector, key) => {
      const _append: JSX.Element[] = [];
      if (connector.isTechPreview) {
        _append.push(
          <EuiBadge key={key + '-preview'} iconType="beaker" color="hollow">
            {i18n.translate(
              'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.thechPreviewBadgeLabel',
              { defaultMessage: 'Tech preview' }
            )}
          </EuiBadge>
        );
      }
      if (connector.isBeta) {
        _append.push(
          <EuiBadge key={key + '-beta'} iconType={'beta'} color="hollow">
            {i18n.translate(
              'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.BetaBadgeLabel',
              {
                defaultMessage: 'Beta',
              }
            )}
          </EuiBadge>
        );
      }
      if (selfManaged === 'native' && !connector.isNative) {
        _append.push(
          <EuiBadge key={key + '-self'} iconType={'warning'} color="warning">
            {i18n.translate(
              'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.OnlySelfManagedBadgeLabel',
              {
                defaultMessage: 'Self managed',
              }
            )}
          </EuiBadge>
        );
      }
      return {
        _append,
        _prepend: <EuiIcon size="l" type={connector.iconPath} />,
        key: key.toString(),
        label: connector.name,
      };
    });
  };

  const initialOptions = getInitialOptions();

  useEffect(() => {
    selectableSetOptions(initialOptions);
  }, [selfManaged]);

  return (
    <EuiFlexItem>
      <EuiComboBox
        aria-label={i18n.translate(
          'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.euiComboBox.accessibleScreenReaderLabelLabel',
          { defaultMessage: 'Select a data source for your connector to use.' }
        )}
        prepend={<EuiIcon type={selectedConnector?.iconPath ?? connectorLogo} size="l" />}
        singleSelection
        fullWidth
        placeholder={i18n.translate(
          'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.placeholder.text',
          { defaultMessage: 'Choose a data source' }
        )}
        options={selectableOptions}
        selectedOptions={selectedOption}
        onChange={(selectedItem) => {
          setSelectedOption(selectedItem);
          if (selectedItem.length === 0) {
            setSelectedConnector(null);
            return;
          }
          const keySelected = Number(selectedItem[0].key);
          setSelectedConnector(allConnectors[keySelected]);
        }}
        renderOption={renderOption}
        rowHeight={(euiTheme.base / 2) * 5}
      />
    </EuiFlexItem>
  );
};
