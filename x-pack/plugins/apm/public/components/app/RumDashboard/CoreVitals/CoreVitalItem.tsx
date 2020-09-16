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
import { i18n } from '@kbn/i18n';
import { PaletteLegends } from './PaletteLegends';
import { ColorPaletteFlexItem } from './ColorPaletteFlexItem';
import {
  AVERAGE_LABEL,
  GOOD_LABEL,
  LESS_LABEL,
  MORE_LABEL,
  POOR_LABEL,
} from './translations';

export interface Thresholds {
  good: string;
  bad: string;
}

interface Props {
  title: string;
  value: string;
  ranks?: number[];
  loading: boolean;
  thresholds: Thresholds;
}

export function getCoreVitalTooltipMessage(
  thresholds: Thresholds,
  position: number,
  title: string,
  percentage: number
) {
  const good = position === 0;
  const bad = position === 2;
  const average = !good && !bad;

  return i18n.translate('xpack.apm.csm.dashboard.webVitals.palette.tooltip', {
    defaultMessage:
      '{percentage} % of users have {exp} experience because the {title} takes {moreOrLess} than {value}{averageMessage}.',
    values: {
      percentage,
      title: title?.toLowerCase(),
      exp: good ? GOOD_LABEL : bad ? POOR_LABEL : AVERAGE_LABEL,
      moreOrLess: bad || average ? MORE_LABEL : LESS_LABEL,
      value: good || average ? thresholds.good : thresholds.bad,
      averageMessage: average
        ? i18n.translate('xpack.apm.rum.coreVitals.averageMessage', {
            defaultMessage: ' and less than {bad}',
            values: { bad: thresholds.bad },
          })
        : '',
    },
  });
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

  const biggestValIndex = ranks.indexOf(Math.max(...ranks));

  return (
    <>
      <EuiStat
        titleSize="s"
        title={value}
        description={title}
        titleColor={palette[biggestValIndex]}
        isLoading={loading}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup
        gutterSize="none"
        alignItems="flexStart"
        style={{ maxWidth: 340 }}
        responsive={false}
      >
        {palette.map((hexCode, ind) => (
          <ColorPaletteFlexItem
            hexCode={hexCode}
            key={hexCode}
            position={ind}
            inFocus={inFocusInd !== ind && inFocusInd !== null}
            percentage={ranks[ind]}
            tooltip={getCoreVitalTooltipMessage(
              thresholds,
              ind,
              title,
              ranks[ind]
            )}
          />
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <PaletteLegends
        ranks={ranks}
        thresholds={thresholds}
        title={title}
        onItemHover={(ind) => {
          setInFocusInd(ind);
        }}
      />
    </>
  );
}
