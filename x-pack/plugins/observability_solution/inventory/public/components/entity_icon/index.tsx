/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  AGENT_NAME,
  CLOUD_PROVIDER,
  ENTITY_TYPE,
  ENTITY_TYPES,
} from '@kbn/observability-shared-plugin/common';
import { type CloudProvider, CloudProviderIcon, AgentIcon } from '@kbn/custom-icons';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { euiThemeVars } from '@kbn/ui-theme';
import type { Entity } from '../../../common/entities';

interface EntityIconProps {
  entity: Entity;
}

type NotNullableCloudProvider = Exclude<CloudProvider, null>;

const getSingleValue = <T,>(value?: T | T[] | null): T | undefined => {
  return value == null ? undefined : Array.isArray(value) ? value[0] : value;
};

export function EntityIcon({ entity }: EntityIconProps) {
  const entityType = entity[ENTITY_TYPE];
  const defaultIconSize = euiThemeVars.euiSizeL;

  if (entityType === ENTITY_TYPES.HOST || entityType === ENTITY_TYPES.CONTAINER) {
    const cloudProvider = getSingleValue(
      entity[CLOUD_PROVIDER] as NotNullableCloudProvider | NotNullableCloudProvider[]
    );
    return (
      <EuiFlexGroup
        style={{ width: defaultIconSize, height: defaultIconSize }}
        alignItems="center"
        justifyContent="center"
      >
        <EuiFlexItem grow={false}>
          <CloudProviderIcon
            cloudProvider={cloudProvider}
            size="m"
            title={cloudProvider}
            role="presentation"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (entityType === ENTITY_TYPES.SERVICE) {
    const agentName = getSingleValue(entity[AGENT_NAME] as AgentName | AgentName[]);
    return <AgentIcon agentName={agentName} role="presentation" />;
  }

  if (entityType.startsWith('kubernetes')) {
    return <EuiIcon type="logoKubernetes" size="l" />;
  }

  // Return an empty EuiIcon instead of null to maintain UI alignment across all EntityIcon usages
  return <EuiIcon type="" size="l" />;
}
