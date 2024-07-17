/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiBadge,
  EuiIcon,
  EuiInputPopover,
  EuiSelectable,
  EuiSelectableOption,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ChooseConnectorSelectableProps {
  allConnectors: Array<{
    description: string;
    iconPath: string;
    isBeta: boolean;
    isNative: boolean;
    isTechPreview: boolean;
    name: string;
  }>;
  connectorSelected: string;
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
  const [isSearching, setIsSearching] = useState(true);
  const [selectableOptions, selectableSetOptions] = useState<
    Array<EuiSelectableOption<OptionData>>
  >([
    ...allConnectors.map(
      (connector: {
        description: string;
        iconPath: string;
        isBeta: boolean;
        isNative: boolean;
        isTechPreview: boolean;
        name: string;
      }): EuiSelectableOption => {
        let append = null;
        if (connector.isTechPreview) {
          append = (
            <EuiBadge iconType="beaker" color="hollow">
              {i18n.translate(
                'xpack.enterpriseSearch.chooseConnectorSelectable.thechPreviewBadgeLabel',
                { defaultMessage: 'Thech preview' }
              )}
            </EuiBadge>
          );
        } else if (connector.isBeta) {
          append = (
            <EuiBadge iconType={'beta'} color="hollow">
              {i18n.translate('xpack.enterpriseSearch.chooseConnectorSelectable.BetaBadgeLabel', {
                defaultMessage: 'Beta',
              })}
            </EuiBadge>
          );
        }
        if (!selfManaged && !connector.isNative) {
          append = (
            <EuiBadge color="warning">
              {i18n.translate(
                'xpack.enterpriseSearch.chooseConnectorSelectable.OnlySelfManagedBadgeLabel',
                {
                  defaultMessage: 'Only as a self managed',
                }
              )}
            </EuiBadge>
          );
        }

        return {
          append,
          disabled: !selfManaged && !connector.isNative,
          label: connector.name,
          prepend: <EuiIcon size="l" type={connector.iconPath} />,
          toolTipContent: connector.description,
        };
      }
    ),
  ]);

  useEffect(() => {
    // Setting options when changing the radiobutton to self managed but it doesn't update the values for disable nor badges
    selectableSetOptions(selectableOptions);
  }, [selfManaged]);

  return (
    <EuiSelectable
      aria-label={i18n.translate(
        'xpack.enterpriseSearch.chooseConnectorSelectable.euiSelectable.selectableInputPopoverLabel',
        { defaultMessage: 'Selectable + input popover example' }
      )}
      options={selectableOptions}
      onChange={(newOptions, event, changedOption) => {
        selectableSetOptions(newOptions);
        setIsOpen(false);
        if (changedOption.checked === 'on') {
          setConnectorSelected(changedOption.label);
          setIsSearching(false);
        } else {
          setConnectorSelected('');
        }
      }}
      listProps={{
        css: {
          '.euiSelectableListItem': { alignItems: 'center' },
          '.euiSelectableList__list': { maxBlockSize: 200 },
        },
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
          setConnectorSelected(value);
          setIsSearching(true);
        },
        onClick: () => setIsOpen(true),
        onFocus: () => setIsOpen(true),
        onKeyDown: (event) => {
          if (event.key === 'Tab') return setIsOpen(false);
          if (event.key !== 'Escape') return setIsOpen(true);
        },
        placeholder: 'Choose a data source',
        value: connectorSelected,
      }}
      isPreFiltered={isSearching ? false : { highlightSearch: false }} // Shows the full list when not actively typing to search
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
  );
};
