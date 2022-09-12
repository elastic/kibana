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
  return (
    <EuiCheckableCard
      {...props}
      id={`checkableCard-${serviceType}`}
      label={
        <EuiFlexGroup alignItems="flexStart" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type={serviceType} />
          </EuiFlexItem>
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
      <EuiText size="s" color="subdued">
        Search over your {name} content with Enterprise Search.
      </EuiText>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        Basic authentication
      </EuiText>
      <EuiSpacer size="s" />
      <EuiLink target="_blank" href={documentationUrl}>
        Documentation
      </EuiLink>
    </EuiCheckableCard>
  );
};
