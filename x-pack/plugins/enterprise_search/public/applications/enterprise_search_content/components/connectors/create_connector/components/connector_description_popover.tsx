/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import connectorLogo from '../../../../../../assets/images/connector.svg';

const nativePopoverPanels = [
  {
    description: i18n.translate(
      'xpack.enterpriseSearch.connectorDescriptionPopover.connectorDescriptionBadge.native.chooseADataSourceLabel',
      { defaultMessage: 'Choose a data source you would like to sync' }
    ),
    icons: [<EuiIcon size="l" type="documents" />],
    id: 'native-choose-source',
  },
  {
    description: i18n.translate(
      'xpack.enterpriseSearch.connectorDescriptionPopover.connectorDescriptionBadge.native.configureConnectorLabel',
      { defaultMessage: 'Configure your connector using our Kibana UI' }
    ),
    icons: [<EuiIcon size="l" type={connectorLogo} />, <EuiIcon size="l" type="logoElastic" />],
    id: 'native-configure-connector',
  },
];

const connectorClientPopoverPanels = [
  {
    description: i18n.translate(
      'xpack.enterpriseSearch.connectorDescriptionPopover.connectorDescriptionBadge.client.chooseADataSourceLabel',
      { defaultMessage: 'Choose a data source you would like to sync' }
    ),
    icons: [<EuiIcon size="l" type="documents" />],
    id: 'client-choose-source',
  },
  {
    description: i18n.translate(
      'xpack.enterpriseSearch.connectorDescriptionPopover.connectorDescriptionBadge.client.configureConnectorLabel',
      {
        defaultMessage:
          'Deploy connector code on your own infrastructure by running from source or using Docker',
      }
    ),
    icons: [
      <EuiIcon size="l" type={connectorLogo} />,
      <EuiIcon size="l" type="sortRight" />,
      <EuiIcon size="l" type="launch" />,
    ],
    id: 'client-deploy',
  },
  {
    description: i18n.translate(
      'xpack.enterpriseSearch.connectorDescriptionPopover.connectorDescriptionBadge.client.enterDetailsLabel',
      {
        defaultMessage: 'Enter access and connection details for your data source',
      }
    ),
    icons: [
      <EuiIcon size="l" type="documents" />,
      <EuiIcon size="l" type="sortRight" />,
      <EuiIcon size="l" type={connectorLogo} />,
      <EuiIcon size="l" type="sortRight" />,
      <EuiIcon size="l" type="logoElastic" />,
    ],
    id: 'client-configure-connector',
  },
];

export interface ConnectorDescriptionPopoverProps {
  isDisabled: boolean;
  isNative: boolean;
}

export const ConnectorDescriptionPopover: React.FC<ConnectorDescriptionPopoverProps> = ({
  isNative,
  isDisabled,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const panels = isNative ? nativePopoverPanels : connectorClientPopoverPanels;
  return (
    <EuiPopover
      anchorPosition="upCenter"
      button={
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.enterpriseSearch.createConnector.iInCircle', {
            defaultMessage: 'More information',
          })}
          data-test-subj="enterpriseSearchConnectorDescriptionPopoverButton"
          iconType="iInCircle"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
      }}
    >
      <EuiPanel hasBorder={false} hasShadow={false}>
        {isDisabled && (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiCallOut
                title={i18n.translate(
                  'xpack.enterpriseSearch.createConnector.connectorDescriptionBadge.notAvailableTitle',
                  {
                    defaultMessage:
                      'This connector is not available as an Elastic-managed Connector',
                  }
                )}
                size="s"
                iconType="warning"
                color="warning"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          {panels.map((panel) => {
            return (
              <EuiFlexItem grow={false} key={panel.id}>
                <EuiFlexGroup
                  direction="column"
                  alignItems="center"
                  gutterSize="s"
                  style={{ maxWidth: 200 }}
                >
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup responsive={false} gutterSize="s">
                      {panel.icons.map((icon, index) => (
                        <EuiFlexItem grow={false} key={index}>
                          {icon}
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" grow={false} textAlign="center">
                      <p>{panel.description}</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPopover>
  );
};
