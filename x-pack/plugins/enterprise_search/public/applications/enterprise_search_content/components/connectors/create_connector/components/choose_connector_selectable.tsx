/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

// import { useLocation } from 'react-router-dom';

import { css } from '@emotion/react';
// import { useValues } from 'kea';

import {
  EuiBadge,
  EuiIcon,
  EuiInputPopover,
  EuiSelectable,
  EuiSelectableOption,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n-react';

import dropbox from '../assets/dropbox.svg';

const connectorsData = [
  {
    name: 'Azure Blob Storage',
    icon: <EuiIcon type={dropbox} size="l" title="Dropbox" />,
    techPreview: false,
    checked: 'on',
  },
  {
    name: 'Confluence Cloud & Server',
    icon: <EuiIcon type={dropbox} size="l" title="Dropbox" />,
    techPreview: true,
  },
  {
    name: 'Confluence Data Center',
    icon: <EuiIcon type={dropbox} size="l" title="Dropbox" />,
    techPreview: false,
  },
  {
    name: 'Dropbox',
    icon: <EuiIcon type={dropbox} size="l" title="Dropbox" />,
    techPreview: true,
  },
  {
    name: 'Azure Blob Storage',
    icon: <EuiIcon type={dropbox} size="l" title="Dropbox" />,
    techPreview: false,
  },
  {
    name: 'Confluence Cloud & Server',
    icon: <EuiIcon type={dropbox} size="l" title="Dropbox" />,
    techPreview: true,
  },
  {
    name: 'Confluence Data Center',
    icon: <EuiIcon type={dropbox} size="l" title="Dropbox" />,
    techPreview: false,
  },
  {
    name: 'Dropbox',
    icon: <EuiIcon type={dropbox} size="l" title="Dropbox" />,
    techPreview: true,
  },
];

interface ChooseConnectorSelectableProps {
  setConnectorSelected: Function;
  connectorSelected: string;
}
interface OptionData {
  secondaryContent?: string;
}

export const ChooseConnectorSelectable: React.FC<ChooseConnectorSelectableProps> = ({
  setConnectorSelected,
  connectorSelected,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(true);
  const [options, setOptions] = useState<Array<EuiSelectableOption<OptionData>>>([
    ...connectorsData.map(
      (connector): EuiSelectableOption => ({
        label: `${connector.name}`,
        prepend: connector.icon,
        append: connector.techPreview ? (
          <EuiBadge iconType="beaker" color="hollow">
            Thech preview
          </EuiBadge>
        ) : null,
      })
    ),
  ]);

  return (
    <EuiSelectable
      aria-label="Selectable + input popover example"
      options={options}
      onChange={(newOptions, event, changedOption) => {
        setOptions(newOptions);
        setIsOpen(false);
        if (changedOption.checked === 'on') {
          setInputValue(changedOption.label);
        //   setConnectorSelected(changedOption.label);
          setIsSearching(false);
        } else {
          setInputValue('');
        }
      }}
      listProps={{
        rowHeight: 50,
        showIcons: false,
        css: { '.euiSelectableList__list': { maxBlockSize: 200 } },
      }}
      singleSelection
      searchable
      searchProps={{
        fullWidth: true,
        isClearable: true,
        placeholder: 'Choose a data source',
        value: inputValue,
        onChange: (value) => {
          setInputValue(value);
          setIsSearching(true);
        },
        onKeyDown: (event) => {
          if (event.key === 'Tab') return setIsOpen(false);
          if (event.key !== 'Escape') return setIsOpen(true);
        },
        onClick: () => setIsOpen(true),
        onFocus: () => setIsOpen(true),
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
