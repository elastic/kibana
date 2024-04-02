/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import { EcsFlat } from '@elastic/ecs';
import { FieldIcon } from '@kbn/react-field';
import React from 'react';

export function HighlightFieldDescription({ fieldName }: { fieldName: string }) {
  const { short, type } = EcsFlat[fieldName as keyof typeof EcsFlat] ?? {};

  if (!short) return null;

  const title = (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      {type && (
        <EuiFlexItem grow={false}>
          <FieldIcon type={type} size="s" />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>{fieldName}</EuiFlexItem>
    </EuiFlexGroup>
  );

  return <EuiIconTip title={title} content={short} color="subdued" />;
}

// eslint-disable-next-line import/no-default-export
export default HighlightFieldDescription;
