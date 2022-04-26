/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { MetricState } from '../../../common/types';
import { SizeOptions } from './size_options';
import { AlignOptions } from './align_options';

export interface TitlePositionProps {
  state: MetricState;
  setState: (newState: MetricState) => void;
}

export const TextFormattingOptions: React.FC<TitlePositionProps> = ({ state, setState }) => {
  return (
    <EuiFormRow
      fullWidth
      display="columnCompressed"
      label={
        <>
          {i18n.translate('xpack.lens.metricChart.textFormattingLabel', {
            defaultMessage: 'Text formatting',
          })}
        </>
      }
    >
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <SizeOptions state={state} setState={setState} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AlignOptions state={state} setState={setState} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
