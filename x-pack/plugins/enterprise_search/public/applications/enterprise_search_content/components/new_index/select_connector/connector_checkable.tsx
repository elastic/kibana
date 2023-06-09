/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiBadge,
  EuiCheckableCard,
  EuiCheckableCardProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { BETA_LABEL, NATIVE_LABEL } from '../../../../shared/constants';

import './connector_checkable.scss';

export type ConnectorCheckableProps = Omit<
  EuiCheckableCardProps,
  'id' | 'label' | 'name' | 'value'
> & {
  documentationUrl: string | undefined;
  icon: string;
  isBeta: boolean;
  isTechPreview: boolean;
  name: string;
  serviceType: string;
  showNativeBadge: boolean;
};

export const ConnectorCheckable: React.FC<ConnectorCheckableProps> = ({
  documentationUrl,
  icon,
  isBeta,
  isTechPreview,
  showNativeBadge,
  name,
  serviceType,
  ...props
}) => {
  return (
    <EuiCheckableCard
      {...props}
      id={`checkableCard-${serviceType}`}
      className="connectorCheckable"
      data-telemetry-id={`entSearchContent-connector-selectConnector-${serviceType}-select`}
      label={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          {icon && (
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>{name}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      name={name}
      value={serviceType}
    >
      <EuiFlexGroup direction="column" gutterSize="xs">
        {documentationUrl && (
          <EuiFlexItem grow={false}>
            <EuiLink target="_blank" href={documentationUrl}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.selectConnector.connectorCheckable.documentationLinkLabel',
                {
                  defaultMessage: 'Documentation',
                }
              )}
            </EuiLink>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            justifyContent="flexStart"
            responsive={false}
          >
            {showNativeBadge && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  <EuiText size="xs">{NATIVE_LABEL}</EuiText>
                </EuiBadge>
              </EuiFlexItem>
            )}
            {isBeta && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  <EuiText size="xs">{BETA_LABEL}</EuiText>
                </EuiBadge>
              </EuiFlexItem>
            )}
            {isTechPreview && (
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
      </EuiFlexGroup>
    </EuiCheckableCard>
  );
};
