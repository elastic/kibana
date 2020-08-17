/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import classNames from 'classnames';
import {
  EuiFlexGroup,
  EuiFlexItem,
  euiPaletteForStatus,
  EuiSpacer,
  EuiStat,
  EuiToolTip,
} from '@elastic/eui';
import styled from 'styled-components';
import { PaletteLegends } from './PaletteLegends';

const ColoredSpan = styled.div`
  height: 16px;
  width: 100px;
  cursor: pointer;
`;

export function ColorPaletteFlexItem({
  hexCode,
  className,
  first,
  last,
  inFocus,
}: {
  hexCode: string;
  className: string;
  first: boolean;
  last: boolean;
  inFocus: boolean;
}) {
  return (
    <EuiFlexItem
      key={hexCode}
      grow={false}
      className={classNames('guideColorPalette__swatch', className)}
    >
      <EuiToolTip content={'you dont believe me?'}>
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

export function CoreVitalItem({ title, value, ranks }: Props) {
  const palette = euiPaletteForStatus(3);

  const [inFocusInd, setInFocusInd] = useState<number | null>(null);

  return (
    <Fragment>
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
      >
        {palette.map((hexCode, ind) => (
          <ColorPaletteFlexItem
            className="guideColorPalette__swatch--notRound"
            hexCode={hexCode}
            key={hexCode}
            first={ind === 0}
            last={ind === 2}
            inFocus={inFocusInd !== ind && inFocusInd !== null}
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
    </Fragment>
  );
}
