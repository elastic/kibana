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
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormRow,
  EuiHighlight,
  EuiIcon,
  EuiInputPopover,
  EuiPanel,
  EuiRadio,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { EuiStepInterface } from '@elastic/eui/src/components/steps/step';
import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n-react';

import { CONNECTOR_CLIENTS_TYPE, CONNECTOR_NATIVE_TYPE } from '../../../../../../common/constants';

// import connectorLogo from '../../../../../assets/images/connector_logo_network_drive_version.svg';

// import { KibanaLogic } from '../../../../shared/kibana';
// import { LicensingLogic } from '../../../../shared/licensing';
// import { parseQueryParams } from '../../../../shared/query_params';

// import { NEW_CONNECTOR_PATH } from '../../../routes';
import { EnterpriseSearchContentPageTemplate } from '../../layout';

import { connectorsBreadcrumbs } from '../connectors';

import connectorsBackgroundImage from './assets/connector_logos_comp.png';
import dropbox from './assets/dropbox.svg';

import { ConnectorDescriptionBadge } from './connector_description_badge_popout';

// import { ConnectorCheckable } from './connector_checkable';

export type ConnectorFilter = typeof CONNECTOR_NATIVE_TYPE | typeof CONNECTOR_CLIENTS_TYPE;

export const parseConnectorFilter = (filter: string | string[] | null): ConnectorFilter | null => {
  const temp = Array.isArray(filter) ? filter[0] : filter ?? null;
  if (!temp) return null;
  if (temp === CONNECTOR_CLIENTS_TYPE) {
    return CONNECTOR_CLIENTS_TYPE;
  }
  if (temp === CONNECTOR_NATIVE_TYPE) {
    return CONNECTOR_NATIVE_TYPE;
  }
  return null;
};

export const CreateConnector: React.FC = () => {
  // const { search } = useLocation();
  // const { connectorTypes, isCloud } = useValues(KibanaLogic);
  // const { hasPlatinumLicense } = useValues(LicensingLogic);
  // const hasNativeAccess = isCloud;
  // const { filter } = parseQueryParams(search);
  /*   const [selectedConnectorFilter, setSelectedConnectorFilter] = useState<ConnectorFilter | null>(
    parseConnectorFilter(filter)
  ); */
  // const useNativeFilter = selectedConnectorFilter === CONNECTOR_NATIVE_TYPE;
  // const useClientsFilter = selectedConnectorFilter === CONNECTOR_CLIENTS_TYPE;
  // const [showTechPreview, setShowTechPreview] = useState(true);
  // const [showBeta, setShowBeta] = useState(true);
  // const [searchTerm, setSearchTerm] = useState('');
  /*   const filteredConnectors = useMemo(() => {
    const nativeConnectors = hasNativeAccess
      ? connectorTypes
          .filter((connector) => connector.isNative)
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];
    const nonNativeConnectors = hasNativeAccess
      ? connectorTypes
          .filter((connector) => !connector.isNative)
          .sort((a, b) => a.name.localeCompare(b.name))
      : connectorTypes.sort((a, b) => a.name.localeCompare(b.name));
    const connectors =
      !hasNativeAccess || useClientsFilter
        ? connectorTypes.sort((a, b) => a.name.localeCompare(b.name))
        : [...nativeConnectors, ...nonNativeConnectors];

    return connectors
      .filter((connector) => (showBeta ? true : !connector.isBeta))
      .filter((connector) => (showTechPreview ? true : !connector.isTechPreview))
      .filter((connector) => (useNativeFilter ? connector.isNative : true))
      .filter((connector) =>
        searchTerm ? connector.name.toLowerCase().includes(searchTerm.toLowerCase()) : true
      );
  }, [hasNativeAccess, useClientsFilter, showBeta, showTechPreview, useNativeFilter, searchTerm]); */
  const { euiTheme } = useEuiTheme();

  // TODO We need to get a state with no children to callapse the hight of each step, it's a mandatory prop for now
  const selfManagedSteps: EuiStepInterface[] = [
    {
      title: 'Start',
      children: <EuiSpacer size="xs" />,
      status: 'current',
    },
    {
      title: 'Deployment',
      children: '',
      status: 'incomplete',
    },
    {
      title: 'Configuration',
      children: '',
      status: 'incomplete',
    },
    {
      title: 'Finish up',
      children: '',
      status: 'incomplete',
    },
  ];

  const elasticManagedSteps: EuiStepInterface[] = [
    {
      title: 'Start',
      children: <EuiSpacer size="xs" />,
      status: 'current',
    },
    {
      title: 'Configuration',
      children: '',
      status: 'incomplete',
    },
    {
      title: 'Finish up',
      children: '',
      status: 'incomplete',
    },
  ];

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

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        ...connectorsBreadcrumbs,
        i18n.translate('xpack.enterpriseSearch.content.indices.selectConnector.breadcrumb', {
          defaultMessage: 'New connector',
        }),
      ]}
      pageViewTelemetry="create_connector"
      isLoading={false}
      pageHeader={{
        description: i18n.translate(
          'xpack.enterpriseSearch.content.indices.selectConnector.description',
          {
            defaultMessage:
              'Extract, transform, index and sync data from a third-party data source.',
          }
        ),
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.indices.selectConnector.title', {
          defaultMessage: 'Create a connector',
        }),
      }}
    >
      <EuiFlexGroup gutterSize="m">
        {/* Col 1 */}
        <EuiFlexItem grow={2}>
          <EuiPanel
            hasShadow={false}
            hasBorder
            color="subdued"
            paddingSize="l"
            css={css`
              background-image: url(${connectorsBackgroundImage});
              background-size: contain;
              background-repeat: no-repeat;
              background-position: bottom center;
            `}
          >
            <EuiButtonEmpty iconType="arrowLeft" size="s">
              Back
            </EuiButtonEmpty>
            <EuiSpacer size="xl" />
            <EuiSteps
              titleSize="xxs"
              steps={
                radioIdSelected === elasticManagedRadioButtonId
                  ? elasticManagedSteps
                  : selfManagedSteps
              }
              css={({ euiTheme }) => css`
                .euiStep__content {
                  padding-block-end: ${euiTheme.size.m};
                }
              `}
            />
          </EuiPanel>
        </EuiFlexItem>
        {/* Col 2 */}
        <EuiFlexItem grow={7}>
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
                    <ConnectorDescriptionBadge isNative={true} />
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
                    <ConnectorDescriptionBadge isNative={false} />
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
                    This process will create a new index, API key, and a Connector ID. Optionally
                    you can bring your own configuration as well.
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiButton iconType="sparkles" fill>
                  Generate configuration
                </EuiButton>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EnterpriseSearchContentPageTemplate>
  );
};
