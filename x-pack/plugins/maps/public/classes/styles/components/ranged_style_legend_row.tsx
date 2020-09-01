/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';

interface Props {
  header: ReactElement<any>;
  minLabel: string | number;
  maxLabel: string | number;
  propertyLabel: string;
  fieldLabel: string;
}

export function RangedStyleLegendRow({
  header,
  minLabel,
  maxLabel,
  propertyLabel,
  fieldLabel,
}: Props) {
  return (
    <div>
      <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" title={propertyLabel} content={fieldLabel}>
            <EuiText className="eui-textTruncate" size="xs" style={{ maxWidth: '180px' }}>
              <small>
                <strong>{fieldLabel}</strong>
              </small>
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      {header}
      <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
        <EuiFlexItem grow={true}>
          <EuiText size="xs">
            <small>{minLabel}</small>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiText textAlign="right" size="xs">
            <small>{maxLabel}</small>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
