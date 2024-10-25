/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type CloudProvider, CloudProviderIcon, AgentIcon } from '@kbn/custom-icons';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import {
  isHostEntity,
  type InventoryEntityLatest,
  isContainerEntity,
  isServiceEntity,
} from '../../../common/entities';

interface EntityIconProps {
  entity: InventoryEntityLatest;
}

export function EntityIcon({ entity }: EntityIconProps) {
  const defaultIconSize = euiThemeVars.euiSizeL;

  if (isHostEntity(entity) || isContainerEntity(entity)) {
    const cloudProvider = entity.cloud?.provider;

    return (
      <EuiFlexGroup
        style={{ width: defaultIconSize, height: defaultIconSize }}
        alignItems="center"
        justifyContent="center"
      >
        <EuiFlexItem grow={false}>
          <CloudProviderIcon
            cloudProvider={cloudProvider as CloudProvider | undefined}
            size="m"
            title={cloudProvider}
            role="presentation"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isServiceEntity(entity)) {
    return <AgentIcon agentName={entity.agent?.name} role="presentation" />;
  }

  if (entityType.startsWith('kubernetes')) {
    return <EuiIcon type="logoKubernetes" size="l" />;
  }

  // Return an empty EuiIcon instead of null to maintain UI alignment across all EntityIcon usages
  return <EuiIcon type="" size="l" />;
}
