/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import moment from 'moment';

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
import { ContentSourceFullData } from '../../../types';
import { REMOTE_SOURCE_LABEL, CREATED_LABEL, STATUS_LABEL, READY_TEXT } from '../constants';

interface SourceInfoCardProps {
  contentSource: ContentSourceFullData;
}

export const SourceInfoCard: React.FC<SourceInfoCardProps> = ({
  contentSource: { baseServiceType, createdAt, name, serviceType, isFederatedSource, mainIcon },
}) => (
  <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="s" justifyContent="flexStart" alignItems="center">
        <EuiFlexItem grow={null}>
          <SourceIcon
            serviceType={baseServiceType || serviceType}
            name={name}
            iconAsBase64={mainIcon}
            size="l"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h1>{name}</h1>
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
        {moment(createdAt).format('MMMM D, YYYY')}
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
