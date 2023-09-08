/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';

import { FriendlyTimingLabels, Timings } from '../../../common/network_data/types';
import { colourPalette } from '../../../common/network_data/data_formatting';
import { WaterfallLegendItem } from './waterfall_legend_item';

export const WaterfallTimingLegend = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup wrap={true} css={{ gap: `min(3%, ${euiTheme.size.l})` }}>
      {Object.values(Timings)
        .filter((t) => t !== Timings.Receive)
        .map((t) => (
          <WaterfallLegendItem
            key={t}
            id={t}
            color={colourPalette[t]}
            label={FriendlyTimingLabels[t]}
          />
        ))}
    </EuiFlexGroup>
  );
};
