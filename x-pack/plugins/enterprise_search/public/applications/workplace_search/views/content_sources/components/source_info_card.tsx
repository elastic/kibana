/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { SourceIcon } from '../../../components/shared/source_icon';

interface SourceInfoCardProps {
  sourceName: string;
  sourceType: string;
  dateCreated: string;
  isFederatedSource: boolean;
}

export const SourceInfoCard: React.FC<SourceInfoCardProps> = ({
  sourceName,
  sourceType,
  dateCreated,
  isFederatedSource,
}) => (
  <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="none" justifyContent="flexStart" alignItems="center">
        <EuiFlexItem grow={null}>
          <SourceIcon
            className="content-source-meta__icon"
            serviceType={sourceType}
            name={sourceType}
            fullBleed
            size="l"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h5 style={{ paddingLeft: 8 }}>{sourceName}</h5>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isFederatedSource && (
        <EuiFlexGroup gutterSize="none" justifyContent="flexStart">
          <EuiFlexItem grow={null}>
            <EuiSpacer size="xs" />
            <EuiBadge iconType="online" iconSide="left">
              Remote Source
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiFlexItem>

    <EuiFlexItem>
      <EuiText textAlign="right" size="s">
        <strong>Created: </strong>
        {dateCreated}
      </EuiText>

      {isFederatedSource && (
        <EuiFlexGroup gutterSize="none" justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={null}>
            <EuiText textAlign="right" size="s">
              <strong>Status: </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={null}>
            <EuiText textAlign="right" size="s">
              <EuiHealth color="success">Ready to search</EuiHealth>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);
