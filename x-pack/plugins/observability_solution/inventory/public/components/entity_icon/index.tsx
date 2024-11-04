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
import type { InventoryEntityLatest } from '../../../common/entities';
import { isEntityOfType } from '../../../common/utils/entity_type_guards';

interface EntityIconProps {
  entity: InventoryEntityLatest;
}

export function EntityIcon({ entity }: EntityIconProps) {
  const defaultIconSize = euiThemeVars.euiSizeL;

  if (isEntityOfType('host', entity) || isEntityOfType('container', entity)) {
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

  if (isEntityOfType('service', entity)) {
    return <AgentIcon agentName={entity.agent?.name} role="presentation" />;
  }

  if (entity.entity.type.startsWith('kubernetes')) {
    return <EuiIcon type="logoKubernetes" size="l" />;
  }

  // Return an empty EuiIcon instead of null to maintain UI alignment across all EntityIcon usages
  return <EuiIcon type="" size="l" />;
}
