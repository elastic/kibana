/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import classNames from 'classnames';
import {
  EuiFlexGroup,
  EuiFlexItem,
  euiPaletteForStatus,
  EuiSpacer,
  EuiStat,
  EuiHealth,
} from '@elastic/eui';
import styled from 'styled-components';

const ColoredSpan = styled.span`
  height: 16px;
  width: 100px;
`;

export const ColorPaletteFlexItem = ({ hexCode, className, first, last }) => {
  return (
    <EuiFlexItem
      key={hexCode}
      grow={false}
      className={classNames('guideColorPalette__swatch', className)}
    >
      <ColoredSpan
        title={hexCode}
        style={{
          backgroundColor: hexCode,
          borderTopLeftRadius: first ? 4 : 0,
          borderBottomLeftRadius: first ? 4 : 0,
          borderTopRightRadius: last ? 4 : 0,
          borderBottomRightRadius: last ? 4 : 0,
        }}
      />
    </EuiFlexItem>
  );
};
export const CoreVitalItem = ({ title, value, color }) => {
  const palette = euiPaletteForStatus(3);

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
          />
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiHealth color="subdued">64%</EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color="subdued">10%</EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHealth color="subdued">5%</EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
    </Fragment>
  );
};
