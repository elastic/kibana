/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCheckableCard,
  EuiCheckableCardProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NATIVE_CONNECTOR_ICONS } from '../../../../../../assets/source_icons/native_connector_icons';

import './connector_checkable.scss';

export type ConnectorCheckableProps = Omit<
  EuiCheckableCardProps,
  'id' | 'label' | 'name' | 'value'
> & {
  documentationUrl: string;
  name: string;
  serviceType: string;
};

export const ConnectorCheckable: React.FC<ConnectorCheckableProps> = ({
  documentationUrl,
  name,
  serviceType,
  ...props
}) => {
  const icon = NATIVE_CONNECTOR_ICONS[serviceType];
  return (
    <EuiCheckableCard
      {...props}
      id={`checkableCard-${serviceType}`}
      className="connectorCheckable"
      data-telemetry-id={`entSearchContent-connector-selectConnector-${serviceType}-select`}
      label={
        <EuiFlexGroup alignItems="center" gutterSize="s">
          {icon && (
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <span>{name}</span>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      name={name}
      value={serviceType}
    >
      <div className="connectorCheckableContent">
        <EuiText size="s" color="subdued">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.selectConnector.connectorCheckable.description',
            {
              defaultMessage: 'Search over your {name} content with Enterprise Search.',
              values: { name },
            }
          )}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.selectConnector.connectorCheckable.basicAuthenticationLabel',
            {
              defaultMessage: 'Basic authentication',
            }
          )}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiLink target="_blank" href={documentationUrl}>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.selectConnector.connectorCheckable.documentationLinkLabel',
            {
              defaultMessage: 'Documentation',
            }
          )}
        </EuiLink>
      </div>
    </EuiCheckableCard>
  );
};
