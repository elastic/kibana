/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSkeletonText, EuiText } from '@elastic/eui';

import type { ConnectorTypes } from '../../../common/types/domain';
import { useKibana } from '../../common/lib/kibana';
import { getConnectorIcon } from '../utils';

interface ConnectorCardProps {
  connectorType: ConnectorTypes;
  title: string;
  listItems: Array<{ title: string; description: React.ReactNode }>;
  isLoading: boolean;
}

const ConnectorCardDisplay: React.FC<ConnectorCardProps> = ({
  connectorType,
  title,
  listItems,
  isLoading,
}) => {
  const { triggersActionsUi } = useKibana().services;

  return (
    <EuiSkeletonText
      lines={3}
      size={'m'}
      isLoading={isLoading}
      data-test-subj="connector-card-loading"
    >
      <EuiFlexGroup direction="column" alignItems="stretch" data-test-subj="connector-card">
        <EuiFlexGroup direction="row" justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiText size="s" data-test-subj="connector-card-title">
              <strong>{title}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon size="xl" type={getConnectorIcon(triggersActionsUi, connectorType)} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem data-test-subj="connector-card-details">
          {listItems.length > 0 &&
            listItems.map((item, i) => (
              <EuiText size="xs" data-test-subj="card-list-item" key={`${item.title}-${i}`}>
                <strong>{`${item.title}: `}</strong>
                {`${item.description}`}
              </EuiText>
            ))}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiSkeletonText>
  );
};
ConnectorCardDisplay.displayName = 'ConnectorCardDisplay';

export const ConnectorCard = memo(ConnectorCardDisplay);
