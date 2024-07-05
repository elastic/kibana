/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

// import { useLocation } from 'react-router-dom';

import { css } from '@emotion/react';
// import { useValues } from 'kea';

import {
  EuiBadge,
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormRow,
  EuiIcon,
  EuiInputPopover,
  EuiPanel,
  EuiRadio,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n-react';

import dropbox from './assets/dropbox.svg';

import { ConnectorDescriptionPopover } from './connector_description_popover';
import { props } from 'cypress/types/bluebird';

interface StartStepProps {
  onRadioButtonChange: (selfManaged: boolean) => void;
}

export const StartStep: React.FC<StartStepProps> = ({ onRadioButtonChange }) => {
  const { euiTheme } = useEuiTheme();

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
  ];

  interface OptionData {
    secondaryContent?: string;
  }

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

  const SelectableInputPopover = () => {
    // const [options, setOptions] = useState<EuiSelectableOption[]>(OPTIONS);
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isSearching, setIsSearching] = useState(true);

    return (
      /*       <EuiFormControlLayout
        clear={{ onClick: () => setInputValue('') }}
        icon={{ type: 'stopFilled', color: 'success', side: 'left', size: 'xl' }}
        css={({ euiTheme }) => css`
          .euiFormControlLayoutIcons--absolute {
            left: ${euiTheme.size.xs};
          }
        `}
      > */
      // TODO - When select update the input value with the connectors icon
      <EuiSelectable
        aria-label="Selectable + input popover example"
        options={options}
        onChange={(newOptions, event, changedOption) => {
          setOptions(newOptions);
          setIsOpen(false);
          if (changedOption.checked === 'on') {
            setInputValue(changedOption.label);
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
      // </EuiFormControlLayout>
    );
  };

  const elasticManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'elasticManagedRadioButton' });
  const selfManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'selfManagedRadioButton' });
  const [radioIdSelected, setRadioIdSelected] = useState(elasticManagedRadioButtonId);

  useEffect(() => {
    onRadioButtonChange(radioIdSelected === selfManagedRadioButtonId ? true : false);
  }, [radioIdSelected]);

  return (
    <>
      <EuiFlexGroup gutterSize="m" direction="column">
        {/* Start */}
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="m">
              <h3>Start</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow fullWidth label="Connector">
                  <SelectableInputPopover />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow fullWidth label="Connector name">
                  <EuiFieldText fullWidth name="first" />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexItem>
              <EuiFormRow fullWidth label="Description">
                <EuiFieldText fullWidth name="first" />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>
        {/* Set up */}
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="s">
              <h4>Set up</h4>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <p>Where do you want to store the connector and how do you want to manage it?</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiRadio
                  id={elasticManagedRadioButtonId}
                  label="Elastic managed"
                  checked={radioIdSelected === elasticManagedRadioButtonId}
                  onChange={() => setRadioIdSelected(elasticManagedRadioButtonId)}
                  name="setUp"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConnectorDescriptionPopover isNative={true} />
              </EuiFlexItem>
              &nbsp; &nbsp;
              <EuiFlexItem grow={false}>
                <EuiRadio
                  id={selfManagedRadioButtonId}
                  label="Self managed"
                  checked={radioIdSelected === selfManagedRadioButtonId}
                  onChange={() => setRadioIdSelected(selfManagedRadioButtonId)}
                  name="setUp"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConnectorDescriptionPopover isNative={false} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        {/* Configure index */}
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="s">
              <h4>Configure index and API key</h4>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <p>
                This process will create a new index, API key, and a Connector ID. Optionally you
                can bring your own configuration as well.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiButton iconType="sparkles" fill>
              Generate configuration
            </EuiButton>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
