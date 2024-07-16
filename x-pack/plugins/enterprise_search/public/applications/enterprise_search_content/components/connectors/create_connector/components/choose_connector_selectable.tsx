/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiBadge,
  EuiIcon,
  EuiInputPopover,
  EuiSelectable,
  EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import dropbox from '../assets/dropbox.svg';

interface ChooseConnectorSelectableProps {
  connectorSelected: string;
  setConnectorSelected: Function;
}
interface OptionData {
  secondaryContent?: string;
}

export const ChooseConnectorSelectable: React.FC<ChooseConnectorSelectableProps> = ({
  setConnectorSelected,
  connectorSelected,
}) => {
  const connectorsData = [
    {
      checked: 'on',
      icon: (
        <EuiIcon
          type={dropbox}
          size="l"
          title={i18n.translate(
            'xpack.enterpriseSearch.chooseConnectorSelectable.euiIcon.dropboxLabel',
            { defaultMessage: 'Dropbox' }
          )}
        />
      ),
      name: 'Azure Blob Storage',
      techPreview: false,
    },
    {
      icon: (
        <EuiIcon
          type={dropbox}
          size="l"
          title={i18n.translate(
            'xpack.enterpriseSearch.chooseConnectorSelectable.euiIcon.dropboxLabel',
            { defaultMessage: 'Dropbox' }
          )}
        />
      ),
      name: 'Confluence Cloud & Server',
      techPreview: true,
    },
    {
      icon: (
        <EuiIcon
          type={dropbox}
          size="l"
          title={i18n.translate(
            'xpack.enterpriseSearch.chooseConnectorSelectable.euiIcon.dropboxLabel',
            { defaultMessage: 'Dropbox' }
          )}
        />
      ),
      name: 'Confluence Data Center',
      techPreview: false,
    },
    {
      icon: (
        <EuiIcon
          type={dropbox}
          size="l"
          title={i18n.translate(
            'xpack.enterpriseSearch.chooseConnectorSelectable.euiIcon.dropboxLabel',
            { defaultMessage: 'Dropbox' }
          )}
        />
      ),
      name: 'Dropbox',
      techPreview: true,
    },
    {
      icon: (
        <EuiIcon
          type={dropbox}
          size="l"
          title={i18n.translate(
            'xpack.enterpriseSearch.chooseConnectorSelectable.euiIcon.dropboxLabel',
            { defaultMessage: 'Dropbox' }
          )}
        />
      ),
      name: 'Azure Blob Storage',
      techPreview: false,
    },
    {
      icon: (
        <EuiIcon
          type={dropbox}
          size="l"
          title={i18n.translate(
            'xpack.enterpriseSearch.chooseConnectorSelectable.euiIcon.dropboxLabel',
            { defaultMessage: 'Dropbox' }
          )}
        />
      ),
      name: 'Confluence Cloud & Server',
      techPreview: true,
    },
    {
      icon: (
        <EuiIcon
          type={dropbox}
          size="l"
          title={i18n.translate(
            'xpack.enterpriseSearch.chooseConnectorSelectable.euiIcon.dropboxLabel',
            { defaultMessage: 'Dropbox' }
          )}
        />
      ),
      name: 'Confluence Data Center',
      techPreview: false,
    },
    {
      icon: (
        <EuiIcon
          type={dropbox}
          size="l"
          title={i18n.translate(
            'xpack.enterpriseSearch.chooseConnectorSelectable.euiIcon.dropboxLabel',
            { defaultMessage: 'Dropbox' }
          )}
        />
      ),
      name: 'Dropbox',

      techPreview: true,
    },
  ];
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(true);
  const [options, setOptions] = useState<Array<EuiSelectableOption<OptionData>>>([
    ...connectorsData.map(
      (connector): EuiSelectableOption => ({
        append: connector.techPreview ? (
          <EuiBadge iconType="beaker" color="hollow">
            {i18n.translate(
              'xpack.enterpriseSearch.chooseConnectorSelectable.thechPreviewBadgeLabel',
              { defaultMessage: 'Thech preview' }
            )}
          </EuiBadge>
        ) : null,
        label: `${connector.name}`,
        prepend: connector.icon,
      })
    ),
  ]);

  return (
    <EuiSelectable
      aria-label={i18n.translate(
        'xpack.enterpriseSearch.chooseConnectorSelectable.euiSelectable.selectableInputPopoverLabel',
        { defaultMessage: 'Selectable + input popover example' }
      )}
      options={options}
      onChange={(newOptions, event, changedOption) => {
        setOptions(newOptions);
        setIsOpen(false);
        if (changedOption.checked === 'on') {
          setConnectorSelected(changedOption.label);
          //   setConnectorSelected(changedOption.label);
          setIsSearching(false);
        } else {
          setConnectorSelected('');
        }
      }}
      listProps={{
        css: { '.euiSelectableList__list': { maxBlockSize: 200 } },
        rowHeight: 50,
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
