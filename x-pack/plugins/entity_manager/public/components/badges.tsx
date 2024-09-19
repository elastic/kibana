/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EntityDefinitionWithState } from '@kbn/entities-schema';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface Props {
  definition: EntityDefinitionWithState;
}

function VersionBadge({ definition }: Props) {
  return (
    <EuiFlexItem grow={0}>
      <EuiBadge color="default">v{definition.version}</EuiBadge>
    </EuiFlexItem>
  );
}

function TypeBadge({ definition }: Props) {
  return (
    <EuiFlexItem grow={0}>
      <EuiBadge color="default">{definition.type}</EuiBadge>
    </EuiFlexItem>
  );
}

function ManagedBadge({ definition }: Props) {
  if (!definition.managed) return null;
  return (
    <EuiFlexItem grow={0}>
      <EuiBadge color="hollow">
        {i18n.translate('xpack.entityManager.managedBadge.managedBadgeLabel', {
          defaultMessage: 'Managed',
        })}
      </EuiBadge>
    </EuiFlexItem>
  );
}

function StatusBadge({ definition }: Props) {
  if (definition.state.running) {
    return (
      <EuiFlexItem grow={0}>
        <EuiBadge color="success">
          {i18n.translate('xpack.entityManager.statusBadge.runningBadgeLabel', {
            defaultMessage: 'Running',
          })}
        </EuiBadge>
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexItem grow={0}>
      <EuiBadge color="danger">
        {i18n.translate('xpack.entityManager.statusBadge.notRunningBadgeLabel', {
          defaultMessage: 'Stopped',
        })}
      </EuiBadge>
    </EuiFlexItem>
  );
}

export function Badges({ definition }: Props) {
  return (
    <EuiFlexGroup gutterSize="xs">
      <StatusBadge definition={definition} />
      <VersionBadge definition={definition} />
      <TypeBadge definition={definition} />
      <ManagedBadge definition={definition} />
    </EuiFlexGroup>
  );
}
