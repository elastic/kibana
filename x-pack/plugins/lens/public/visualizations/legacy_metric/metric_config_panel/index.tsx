/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { VisualizationToolbarProps } from '../../../types';
import type { LegacyMetricState } from '../../../../common/types';
import { TitlesAndTextOptionsPopover } from './titles_and_text_options_popover';

export const MetricToolbar = memo(function MetricToolbar({
  state,
  setState,
  frame,
}: VisualizationToolbarProps<LegacyMetricState>) {
  return (
    <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="none" responsive={false}>
          <TitlesAndTextOptionsPopover
            state={state}
            setState={setState}
            datasourceLayers={frame.datasourceLayers}
          />
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
