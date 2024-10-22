/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup } from '@elastic/eui';
import React from 'react';

export function EntityBadge({ entity }: { entity: Record<string, string> }) {
  return (
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
      {Object.entries(entity).map(([field, value]) => (
        <EuiBadge key={field} color="ghost">{`${field}:${value}`}</EuiBadge>
      ))}
    </EuiFlexGroup>
  );
}
