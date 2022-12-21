/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import { asPercentage } from '../../utils/formatters/as_percentage';
import { Legend, LegendItem } from '../legend';

export function FlameGraphLegend({
  legendItems,
  asScale,
}: {
  legendItems: LegendItem[];
  asScale: boolean;
}) {
  if (asScale) {
    return (
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="s">&lt;+{asPercentage(1)}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem style={{ width: legendItems.length * 20 }}>
              <EuiFlexGroup direction="row" gutterSize="none">
                {legendItems.map(({ color }) => {
                  return <EuiFlexItem style={{ backgroundColor: color }} />;
                })}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">&gt;{asPercentage(-1)}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return <Legend legendItems={legendItems} />;
}
