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
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n-react';

import dropbox from './assets/dropbox.svg';

import { ConnectorDescriptionPopover } from './connector_description_popover';

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

  interface OptionData {
    secondaryContent?: string;
  }

  const SelectableInputPopover = () => {
    // const [options, setOptions] = useState<EuiSelectableOption[]>(OPTIONS);
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
        onChange={() => setOptions(options)}
        listProps={{
          rowHeight: 50,
          showIcons: false,
          css: { '.euiSelectableList__list': { maxBlockSize: 200 } },
          bordered: true,
        }}
        singleSelection
        searchable
        height={240}
      >
        {(list, search) => (
          <>
            {search}
            {list}
          </>
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
                <EuiFlexGroup direction="column">
                  <EuiFlexItem>
                    <EuiFormRow fullWidth label="Connector name">
                      <EuiFieldText fullWidth name="first" />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow fullWidth label="Description">
                      <EuiTextArea fullWidth name="first" />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
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
