/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent, useState } from 'react';

import { css } from '@emotion/react';

import {
  EuiBadge,
  EuiButtonIcon,
  EuiCard,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { BETA_LABEL, NATIVE_LABEL, CONNECTOR_CLIENT_LABEL } from '../../../../shared/constants';

import './connector_checkable.scss';
import { PlatinumLicensePopover } from '../../shared/platinum_license_popover/platinum_license_popover';

export interface ConnectorCheckableProps {
  documentationUrl: string | undefined;
  iconType: string;
  isBeta: boolean;
  isDisabled: boolean;
  isTechPreview: boolean;
  name: string;
  onConnectorSelect: (isNative?: boolean) => void;
  serviceType: string;
  showNativeBadge: boolean;
}

export const ConnectorCheckable: React.FC<ConnectorCheckableProps> = ({
  isDisabled,
  documentationUrl,
  iconType,
  isBeta,
  isTechPreview,
  name,
  onConnectorSelect,
  serviceType,
  showNativeBadge,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isLicensePopoverOpen, setIsLicensePopoverOpen] = useState(false);
  const [isNativePopoverOpen, setIsNativePopoverOpen] = useState(false);
  return (
    <EuiCard
      onClick={() => onConnectorSelect()}
      hasBorder
      id={`checkableCard-${serviceType}`}
      css={
        showNativeBadge
          ? css`
              box-shadow: 8px 9px 0px -1px ${euiTheme.colors.lightestShade},
                8px 9px 0px 0px ${euiTheme.colors.lightShade};
            `
          : undefined
      }
      layout="horizontal"
      data-telemetry-id={`entSearchContent-connector-selectConnector-${serviceType}-select`}
      icon={iconType ? <EuiIcon type={iconType} size="l" /> : undefined}
      title={
        <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="spaceAround">
          <EuiFlexItem grow>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                {isDisabled ? (
                  <EuiText color="disabledText" size="xs">
                    <h3>{name}</h3>
                  </EuiText>
                ) : (
                  <EuiTitle size="xs">
                    <h2>{name}</h2>
                  </EuiTitle>
                )}
              </EuiFlexItem>
              {isDisabled && (
                <EuiFlexItem grow={false}>
                  <PlatinumLicensePopover
                    button={
                      <EuiButtonIcon
                        aria-label={i18n.translate(
                          'xpack.enterpriseSearch.content.newIndex.selectConnector.openPopoverLabel',
                          {
                            defaultMessage: 'Open licensing popover',
                          }
                        )}
                        iconType="questionInCircle"
                        onClick={() => setIsLicensePopoverOpen(!isLicensePopoverOpen)}
                      />
                    }
                    closePopover={() => setIsLicensePopoverOpen(false)}
                    isPopoverOpen={isLicensePopoverOpen}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {showNativeBadge && (
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiButtonIcon
                    display="base"
                    isDisabled={isDisabled}
                    color="primary"
                    iconType="boxesHorizontal"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsNativePopoverOpen(true);
                    }}
                  />
                }
                isOpen={isNativePopoverOpen}
                closePopover={() => {
                  setIsNativePopoverOpen(false);
                }}
              >
                <EuiContextMenuPanel
                  size="xs"
                  items={[
                    <EuiContextMenuItem
                      key="native"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConnectorSelect(true);
                      }}
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.connectorCheckable.setupANativeConnectorContextMenuItemLabel',
                        { defaultMessage: 'Setup a Native Connector' }
                      )}
                    </EuiContextMenuItem>,
                    <EuiContextMenuItem
                      key="client"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConnectorSelect(false);
                      }}
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.connectorCheckable.setupAConnectorClientContextMenuItemLabel',
                        { defaultMessage: 'Setup a Connector Client' }
                      )}
                    </EuiContextMenuItem>,
                  ]}
                />
              </EuiPopover>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
    >
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            justifyContent="flexStart"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiBadge isDisabled={isDisabled}>
                <EuiText size="xs">
                  {showNativeBadge ? NATIVE_LABEL : CONNECTOR_CLIENT_LABEL}
                </EuiText>
              </EuiBadge>
            </EuiFlexItem>
            {isBeta && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" isDisabled={isDisabled}>
                  <EuiText size="xs">{BETA_LABEL}</EuiText>
                </EuiBadge>
              </EuiFlexItem>
            )}
            {isTechPreview && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" iconType="beaker" isDisabled={isDisabled}>
                  <EuiText size="xs">
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.connectorCheckable.techPreviewLabel',
                      {
                        defaultMessage: 'Tech preview',
                      }
                    )}
                  </EuiText>
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {documentationUrl && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <EuiLink target="_blank" href={documentationUrl}>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.selectConnector.connectorCheckable.documentationLinkLabel',
                  {
                    defaultMessage: 'Documentation',
                  }
                )}
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiCard>
  );
};
