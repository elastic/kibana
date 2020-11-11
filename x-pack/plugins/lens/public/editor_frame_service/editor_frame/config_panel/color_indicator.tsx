/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { AccessorConfig } from '../../../types';

export function ColorIndicator({
  accessorConfig,
  children,
}: {
  accessorConfig: AccessorConfig;
  children: React.ReactChild;
}) {
  return (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      {accessorConfig.triggerIcon === 'color' && accessorConfig.color && (
        <EuiFlexItem grow={false}>
          <div
            className="lnsLayerPanel__colorIndicator lnsLayerPanel__colorIndicator--solidColor"
            style={{
              backgroundColor: accessorConfig.color,
            }}
          />
        </EuiFlexItem>
      )}
      {accessorConfig.triggerIcon === 'disabled' && (
        <EuiFlexItem grow={false}>
          <EuiIcon
            type="stopSlash"
            color="subdued"
            size="s"
            className="lnsLayerPanel__colorIndicator"
          />
        </EuiFlexItem>
      )}
      {accessorConfig.triggerIcon === 'colorBy' && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="brush" color="text" size="s" className="lnsLayerPanel__colorIndicator" />
        </EuiFlexItem>
      )}
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
