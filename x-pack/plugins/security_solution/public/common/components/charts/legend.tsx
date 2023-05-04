/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';

import { LegendItem } from './legend_item';

const LegendComponent: React.FC<{
  legendItems: LegendItem[];
}> = ({ legendItems }) => {
  if (legendItems.length === 0) {
    return null;
  }

  return (
    <EuiText size="xs" data-test-subj="legend">
      <EuiFlexGroup direction="column" gutterSize="none">
        {legendItems.map((item, i) => (
          <EuiFlexItem key={`legend-item-${i}`} grow={false}>
            <LegendItem legendItem={item} />
            <EuiSpacer data-test-subj="legend-spacer" size="s" />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiText>
  );
};

LegendComponent.displayName = 'LegendComponent';

export const Legend = React.memo(LegendComponent);
