/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
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
      <EuiFlexGroup direction="column" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup direction="row">
                <EuiFlexItem>
                  <EuiText textAlign="center" size="s">
                    {i18n.translate('xpack.profiling.flameGraphLegend.improvement', {
                      defaultMessage: 'Improvement',
                    })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText textAlign="center" size="s">
                    {i18n.translate('xpack.profiling.flameGraphLegend.regression', {
                      defaultMessage: 'Regression',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup direction="row">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup direction="row" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">+{asPercentage(1)}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem style={{ width: legendItems.length * 20 }}>
                      <EuiFlexGroup direction="row" gutterSize="none">
                        {legendItems.map(({ color, label }) => {
                          return (
                            <EuiFlexItem
                              key={label}
                              style={{ backgroundColor: color, justifyContent: 'center' }}
                            >
                              {label ? (
                                <EuiText
                                  size="xs"
                                  style={{
                                    verticalAlign: 'center',
                                    whiteSpace: 'nowrap',
                                    paddingLeft: 8,
                                    paddingRight: 8,
                                  }}
                                >
                                  {label}
                                </EuiText>
                              ) : (
                                ''
                              )}
                            </EuiFlexItem>
                          );
                        })}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">{asPercentage(-1)}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return <Legend legendItems={legendItems} />;
}
