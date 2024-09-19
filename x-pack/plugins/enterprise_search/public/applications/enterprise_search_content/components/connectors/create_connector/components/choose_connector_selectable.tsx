/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { css } from '@emotion/react';

import {
  EuiBadge,
  EuiFlexItem,
  EuiIcon,
  EuiInputPopover,
  EuiSelectable,
  EuiSelectableOption,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConnectorDefinition } from '@kbn/search-connectors-plugin/public';

interface ChooseConnectorSelectableProps {
  allConnectors: ConnectorDefinition[];
  connectorSelected: ConnectorDefinition;
  selfManaged: boolean;
  setConnectorSelected: Function;
}
interface OptionData {
  secondaryContent?: string;
}

export const ChooseConnectorSelectable: React.FC<ChooseConnectorSelectableProps> = ({
  setConnectorSelected,
  connectorSelected,
  selfManaged,
  allConnectors,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [selectableOptions, selectableSetOptions] = useState<
    Array<EuiSelectableOption<OptionData>>
  >([]);
  const getInitialOptions = () => {
    return allConnectors.map((connector, key) => {
      const append: JSX.Element[] = [];
      if (connector.isTechPreview) {
        append.push(
          <EuiBadge key={key + '-preview'} iconType="beaker" color="hollow">
            {i18n.translate(
              'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.thechPreviewBadgeLabel',
              { defaultMessage: 'Tech preview' }
            )}
          </EuiBadge>
        );
      }
      if (connector.isBeta) {
        append.push(
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
      if (!selfManaged && !connector.isNative) {
        append.push(
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
        append,
        key: key.toString(),
        label: connector.name,
        prepend: <EuiIcon size="l" type={connector.iconPath} />,
      };
    });
  };

  const initialOptions = getInitialOptions();

  useEffect(() => {
    selectableSetOptions(initialOptions);
  }, [selfManaged]);
  const [searchValue, setSearchValue] = useState('');

  return (
    <EuiFlexItem
      css={css`
        position: relative;
      `}
    >
      {connectorSelected.iconPath && ( // TODO this is a hack, that shouldn't be merged like this.
        <EuiIcon
          type={connectorSelected.iconPath}
          size="l"
          css={css`
            position: absolute;
            top: 8px;
            left: 10px;
            z-index: 2;
          `}
        />
      )}

      <EuiSelectable
        aria-label={i18n.translate(
          'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.euiSelectable.selectableInputPopoverLabel',
          { defaultMessage: 'Selectable + input popover example' }
        )}
        css={css`
          .euiFormControlLayoutIcons--left {
            display: ${connectorSelected.iconPath
              ? 'none'
              : ''}; // TODO this is a hack, that shouldn't be merged like this.
          }
          .euiFieldSearch {
            padding-left: 45px;
          }
        `}
        options={selectableOptions}
        onChange={(newOptions, _, changedOption) => {
          console.log('newOptions', newOptions);
          console.log('changedOption', changedOption);

          selectableSetOptions(newOptions);
          setIsOpen(false);
          if (changedOption.checked === 'on') {
            const keySelected = Number(changedOption.key);
            setConnectorSelected(allConnectors[keySelected]);
            setSearchValue(allConnectors[keySelected].name);
          } else {
            setConnectorSelected({ name: '' });
            setSearchValue('');
          }
        }}
        listProps={{
          isVirtualized: true,
          rowHeight: Number(euiTheme.base * 3),
          showIcons: false,
        }}
        singleSelection
        searchable
        searchProps={{
          fullWidth: true,
          isClearable: true,
          onChange: (value) => {
            if (value !== connectorSelected.name) {
              setSearchValue(value);
            }
          },
          onFocus: () => setIsOpen(true), // TODO useCallback
          onClick: () => setIsOpen(true), // TODO useCallback
          placeholder: i18n.translate(
            'xpack.enterpriseSearch.createConnector.chooseConnectorSelectable.placeholder.text',
            { defaultMessage: 'Choose a data source' }
          ),
          value: searchValue,
        }}
      >
        {(list, search) => (
          <EuiInputPopover
            fullWidth
            closePopover={() => setIsOpen(false)}
            disableFocusTrap
            closeOnScroll
            isOpen={isOpen}
            input={search!}
            panelPaddingSize="none"
          >
            {list}
          </EuiInputPopover>
        )}
      </EuiSelectable>
    </EuiFlexItem>
  );
};
