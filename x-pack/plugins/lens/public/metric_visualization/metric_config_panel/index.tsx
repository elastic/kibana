/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, htmlIdGenerator } from '@elastic/eui';
import type { VisualizationToolbarProps } from '../../types';
import type { MetricState } from '../../../common/types';

import { AppearanceOptionsPopover } from './appearance_options_popover';

export const MetricToolbar = memo(function MetricToolbar(
  props: VisualizationToolbarProps<MetricState>
) {
  const { state, setState, frame } = props;

  return (
    <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="none" responsive={false}>
          <AppearanceOptionsPopover
            state={state}
            setState={setState}
            datasourceLayers={frame.datasourceLayers}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

export const idPrefix = htmlIdGenerator()();
