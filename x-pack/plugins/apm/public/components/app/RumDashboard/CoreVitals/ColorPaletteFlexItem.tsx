/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import classNames from 'classnames';
import {
  EuiFlexGroup,
  EuiFlexItem,
  euiPaletteForStatus,
  EuiSpacer,
  EuiStat,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { PaletteLegends } from './PaletteLegends';

const ColoredSpan = styled.div`
  height: 16px;
  width: 100%;
  cursor: pointer;
`;

export function ColorPaletteFlexItem({
  hexCode,
  className,
  first,
  last,
  inFocus,
  percentage,
}: {
  hexCode: string;
  className: string;
  first: boolean;
  last: boolean;
  inFocus: boolean;
  percentage: number;
}) {
  return (
    <EuiFlexItem
      key={hexCode}
      grow={false}
      className={classNames('guideColorPalette__swatch', className)}
      style={{ width: percentage + '%' }}
    >
      <EuiToolTip
        content={i18n.translate(
          'xpack.apm.csm.dashboard.webVitals.pallette.tooltip',
          {
            defaultMessage:
              '{percentage} % of users have a poor experience because the first input delay takes more than XXms.',
            values: { percentage },
          }
        )}
      >
        <ColoredSpan
          title={hexCode}
          style={{
            backgroundColor: hexCode,
            borderTopLeftRadius: first ? 4 : 0,
            borderBottomLeftRadius: first ? 4 : 0,
            borderTopRightRadius: last ? 4 : 0,
            borderBottomRightRadius: last ? 4 : 0,
            opacity: !inFocus ? 1 : 0.3,
          }}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );
}

interface Props {
  title: string;
  value: string;
  ranks: number[];
}

export function CoreVitalItem({ title, value, ranks = [100, 0, 0] }: Props) {
  const palette = euiPaletteForStatus(3);

  const [inFocusInd, setInFocusInd] = useState<number | null>(null);

  return (
    <>
      <EuiStat
        titleSize="s"
        title={value}
        description={title}
        titleColor={palette[0]}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup
        className="guideColorPalette__swatchHolder"
        gutterSize="none"
        alignItems="flexStart"
        style={{ width: 340 }}
      >
        {palette.map((hexCode, ind) => (
          <ColorPaletteFlexItem
            className="guideColorPalette__swatch--notRound"
            hexCode={hexCode}
            key={hexCode}
            first={ind === 0}
            last={ind === 2}
            inFocus={inFocusInd !== ind && inFocusInd !== null}
            percentage={ranks[ind]}
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
