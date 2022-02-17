/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { REMOTE_SOURCE_LABEL, CREATED_LABEL, STATUS_LABEL, READY_TEXT } from '../constants';

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
      <EuiFlexGroup gutterSize="s" justifyContent="flexStart" alignItems="center">
        <EuiFlexItem grow={null}>
          <SourceIcon serviceType={sourceType} name={sourceType} size="l" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h1>{sourceName}</h1>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isFederatedSource && (
        <EuiFlexGroup gutterSize="none" justifyContent="flexStart">
          <EuiFlexItem grow={null}>
            <EuiSpacer size="xs" />
            <EuiBadge iconType="online" iconSide="left">
              {REMOTE_SOURCE_LABEL}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiFlexItem>

    <EuiFlexItem>
      <EuiText textAlign="right" size="s">
        <strong>{CREATED_LABEL}</strong>
        {dateCreated}
      </EuiText>

      {isFederatedSource && (
        <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={null}>
            <strong>{STATUS_LABEL}</strong>
          </EuiFlexItem>
          <EuiFlexItem grow={null}>
            <EuiHealth color="success">{READY_TEXT}</EuiHealth>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);
