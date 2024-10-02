/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AGENT_NAME, CLOUD_PROVIDER } from '@kbn/observability-shared-plugin/common';
import { type CloudProvider, CloudProviderIcon, AgentIcon } from '@kbn/custom-icons';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { euiThemeVars } from '@kbn/ui-theme';
import { ENTITY_TYPE } from '../../../common/es_fields/entities';
import type { Entity } from '../../../common/entities';

interface EntityIconProps {
  entity: Entity;
}

export function EntityIcon({ entity }: EntityIconProps) {
  const entityType = entity[ENTITY_TYPE];
  const defaultSizeIconPx = euiThemeVars.euiSizeL;
  const emptyIcon = (
    <div
      style={{
        width: defaultSizeIconPx,
        height: defaultSizeIconPx,
      }}
    />
  );

  if (entityType === 'host' || entityType === 'container') {
    const cloudProvider = entity[CLOUD_PROVIDER] as CloudProvider;

    const formattedCloudProvider =
      typeof cloudProvider === 'string' ? cloudProvider : cloudProvider?.[0];

    return (
      <EuiFlexGroup
        style={{
          width: defaultSizeIconPx,
          height: defaultSizeIconPx,
        }}
        alignItems="center"
        justifyContent="center"
      >
        <EuiFlexItem grow={false}>
          <CloudProviderIcon
            cloudProvider={formattedCloudProvider}
            size="m"
            title={formattedCloudProvider}
            role="presentation"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (entityType === 'service') {
    const agentName = entity[AGENT_NAME] as AgentName;
    return <AgentIcon agentName={agentName} role="presentation" />;
  }

  return emptyIcon;
}
