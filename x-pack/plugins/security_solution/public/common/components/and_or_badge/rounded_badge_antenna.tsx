/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

import { RoundedBadge } from './rounded_badge';
import { AndOr } from '.';

const antennaStyles = css`
  background: ${({ theme }) => theme.eui.euiColorLightShade};
  position: relative;
  width: 2px;
  &:after {
    background: ${({ theme }) => theme.eui.euiColorLightShade};
    content: '';
    height: 8px;
    right: -4px;
    position: absolute;
    width: 10px;
    clip-path: circle();
  }
`;

const TopAntenna = styled(EuiFlexItem)`
  ${antennaStyles}
  &:after {
    top: 0;
  }
`;
const BottomAntenna = styled(EuiFlexItem)`
  ${antennaStyles}
  &:after {
    bottom: 0;
  }
`;

export const RoundedBadgeAntenna: React.FC<{ type: AndOr }> = ({ type }) => (
  <EuiFlexGroup
    className="andBadgeContainer"
    gutterSize="none"
    direction="column"
    alignItems="center"
  >
    <TopAntenna data-test-subj="andOrBadgeBarTop" grow={1} />
    <EuiFlexItem grow={false}>
      <RoundedBadge type={type} />
    </EuiFlexItem>
    <BottomAntenna data-test-subj="andOrBadgeBarBottom" grow={1} />
  </EuiFlexGroup>
);

RoundedBadgeAntenna.displayName = 'RoundedBadgeAntenna';
