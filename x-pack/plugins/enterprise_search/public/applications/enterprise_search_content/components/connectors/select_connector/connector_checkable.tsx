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
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiThemeComputed,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EXAMPLE_CONNECTOR_SERVICE_TYPES } from '../../../../../../common/constants';

import {
  BETA_LABEL,
  NATIVE_LABEL,
  CONNECTOR_CLIENT_LABEL,
  EXAMPLE_CONNECTOR_LABEL,
} from '../../../../shared/constants';

import { PlatinumLicensePopover } from '../../shared/platinum_license_popover/platinum_license_popover';

import { NativePopover } from './native_popover';

export interface ConnectorCheckableProps {
  documentationUrl: string | undefined;
  iconType: string;
  isBeta: boolean;
  isDisabled: boolean;
  isTechPreview: boolean;
  name: string;
  onConnectorSelect: (isNative?: boolean) => void;
  serviceType: string;
  showLicensePopover?: boolean;
  showNativeBadge: boolean;
  showNativePopover?: boolean;
}

const getCss = (
  euiTheme: EuiThemeComputed,
  isDisabled: boolean,
  showNativeBadge: ConnectorCheckableProps['showNativeBadge']
) => {
  return css`
    ${showNativeBadge &&
    `box-shadow: 8px 9px 0px -1px ${euiTheme.colors.lightestShade},
      8px 9px 0px 0px ${euiTheme.colors.lightShade};`}
    ${isDisabled &&
    `background-color: ${euiTheme.colors.lightestShade};
    color: ${euiTheme.colors.disabledText};
    `}
  `;
};

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
  showLicensePopover = false,
  showNativePopover = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isLicensePopoverOpen, setIsLicensePopoverOpen] = useState(false);
  const [isNativeInfoPopoverOpen, setIsNativeInfoPopoverOpen] = useState(false);
  const [isNativePopoverOpen, setIsNativePopoverOpen] = useState(false);
  return (
    <EuiPanel
      element="div"
      onClick={() => {
        if (isDisabled && showNativeBadge) return;
        onConnectorSelect(showNativeBadge);
      }}
      id={`checkableCard-${serviceType}`}
      css={getCss(euiTheme, isDisabled || showLicensePopover, showNativeBadge)}
      hasBorder
      data-telemetry-id={`entSearchContent-connector-selectConnector-${serviceType}-select`}
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          {iconType ? <EuiIcon type={iconType} size="l" /> : null}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="spaceAround">
                <EuiFlexItem grow>
                  <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
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
                    {!showNativePopover && showLicensePopover && (
                      <EuiFlexItem grow={false}>
                        <PlatinumLicensePopover
                          button={
                            <EuiButtonIcon
                              data-test-subj="entSearchContent-connectors-selectConnector-licensePopoverButton"
                              data-telemetry-id="entSearchContent-connectors-selectConnector-licensePopoverButton"
                              aria-label={i18n.translate(
                                'xpack.enterpriseSearch.content.newIndex.selectConnector.openPopoverLabel',
                                {
                                  defaultMessage: 'Open licensing popover',
                                }
                              )}
                              iconType="questionInCircle"
                              onClick={(event: MouseEvent) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setIsLicensePopoverOpen(!isLicensePopoverOpen);
                              }}
                            />
                          }
                          closePopover={() => setIsLicensePopoverOpen(false)}
                          isPopoverOpen={isLicensePopoverOpen}
                        />
                      </EuiFlexItem>
                    )}
                    {showNativePopover && (
                      <EuiFlexItem grow={false}>
                        <NativePopover
                          button={
                            <EuiButtonIcon
                              data-test-subj="entSearchContent-connectors-selectConnector-nativeInfoPopoverButton"
                              data-telemetry-id="entSearchContent-connectors-selectConnector-nativeInfoPopoverButton"
                              aria-label={i18n.translate(
                                'xpack.enterpriseSearch.content.newIndex.selectConnector.openNativePopoverLabel',
                                {
                                  defaultMessage:
                                    'Open popover with information about native connectors',
                                }
                              )}
                              iconType="questionInCircle"
                              onClick={(event: MouseEvent) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setIsNativeInfoPopoverOpen(!isNativeInfoPopoverOpen);
                              }}
                            />
                          }
                          closePopover={() => setIsNativeInfoPopoverOpen(false)}
                          isPopoverOpen={isNativeInfoPopoverOpen}
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
                          aria-label={i18n.translate(
                            'xpack.enterpriseSearch.content.newIndex.selectConnector.openCreateConnectorPopover',
                            {
                              defaultMessage:
                                'Open menu to create a connector of type {connectorType}',
                              values: { connectorType: name },
                            }
                          )}
                          data-test-subj="entSearchContent-connectors-selectConnector-nativePopoverButton"
                          data-telemetry-id="entSearchContent-connectors-selectConnector-nativePopoverButton"
                          display="base"
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
                        size="s"
                        items={[
                          <EuiContextMenuItem
                            key="native"
                            disabled={isDisabled}
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
                          <EuiSpacer key="spacer" size="s" />,
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
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="xs">
                <EuiFlexItem>
                  <EuiFlexGroup
                    direction="row"
                    gutterSize="s"
                    justifyContent="flexStart"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiBadge>
                        <EuiText size="xs">
                          {showNativeBadge ? NATIVE_LABEL : CONNECTOR_CLIENT_LABEL}
                        </EuiText>
                      </EuiBadge>
                    </EuiFlexItem>
                    {isBeta && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">
                          <EuiText size="xs">{BETA_LABEL}</EuiText>
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                    {EXAMPLE_CONNECTOR_SERVICE_TYPES.includes(serviceType) && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow" iconType="beaker">
                          <EuiText size="xs">{EXAMPLE_CONNECTOR_LABEL}</EuiText>
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                    {isTechPreview && !EXAMPLE_CONNECTOR_SERVICE_TYPES.includes(serviceType) && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow" iconType="beaker">
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
                      <EuiLink
                        data-test-subj="entSearchContent-connectors-selectConnector-documentationLink"
                        data-telemetry-id="entSearchContent-connectors-selectConnector-documentationLink"
                        target="_blank"
                        href={documentationUrl}
                      >
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
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
