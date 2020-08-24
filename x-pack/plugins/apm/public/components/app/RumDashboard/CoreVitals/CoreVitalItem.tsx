/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  euiPaletteForStatus,
  EuiSpacer,
  EuiStat,
} from '@elastic/eui';
import React, { useState } from 'react';
import { PaletteLegends } from './PaletteLegends';
import { ColorPaletteFlexItem } from './ColorPaletteFlexItem';

interface Props {
  title: string;
  value: string;
  ranks?: number[];
  loading: boolean;
  thresholds: { good: string; bad: string };
}

export function CoreVitalItem({
  loading,
  title,
  value,
  thresholds,
  ranks = [100, 0, 0],
}: Props) {
  const palette = euiPaletteForStatus(3);

  const [inFocusInd, setInFocusInd] = useState<number | null>(null);

  return (
    <>
      <EuiStat
        titleSize="s"
        title={value}
        description={title}
        titleColor={palette[0]}
        isLoading={loading}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup
        gutterSize="none"
        alignItems="flexStart"
        style={{ width: 340 }}
      >
        {palette.map((hexCode, ind) => (
          <ColorPaletteFlexItem
            hexCode={hexCode}
            key={hexCode}
            position={ind}
            inFocus={inFocusInd !== ind && inFocusInd !== null}
            percentage={ranks[ind]}
            title={title}
            thresholds={thresholds}
          />
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <PaletteLegends
        ranks={ranks}
        onItemHover={(ind) => {
          setInFocusInd(ind);
        }}
      />
      <EuiSpacer size="xl" />
    </>
  );
}
