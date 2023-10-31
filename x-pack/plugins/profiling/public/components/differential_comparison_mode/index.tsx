/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ComparisonMode } from '../normalization_menu';

interface Props {
  comparisonMode: ComparisonMode;
  onChange: (nextComparisonMode: ComparisonMode) => void;
}
export function DifferentialComparisonMode({ comparisonMode, onChange }: Props) {
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.profiling.differentialComparisonMode.title', {
                defaultMessage: 'Format',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.profiling.differentialComparisonMode.legend', {
              defaultMessage:
                'This switch allows you to switch between an absolute and relative comparison between both graphs',
            })}
            type="single"
            buttonSize="s"
            idSelected={comparisonMode}
            onChange={(nextComparisonMode) => {
              onChange(nextComparisonMode as ComparisonMode);
            }}
            options={[
              {
                id: ComparisonMode.Absolute,
                label: i18n.translate(
                  'xpack.profiling.differentialComparisonMode.absoluteButtonLabel',
                  { defaultMessage: 'Abs' }
                ),
              },
              {
                id: ComparisonMode.Relative,
                label: i18n.translate(
                  'xpack.profiling.differentialComparisonMode.relativeButtonLabel',
                  { defaultMessage: 'Rel' }
                ),
              },
            ]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
