/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiBadge, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import * as i18n from './translations';

const AndOrBadgeAntenna = styled(EuiFlexItem)`
  background: ${({ theme }) => theme.eui.euiColorLightShade};
  position: relative;
  width: 2px;
  &:after {
    background: ${({ theme }) => theme.eui.euiColorLightShade};
    content: '';
    height: 8px;
    right: -4px;
    position: absolute;
    width: 9px;
    clip-path: circle();
  }
  &.topAndOrBadgeAntenna {
    &:after {
      top: -1px;
    }
  }
  &.bottomAndOrBadgeAntenna {
    &:after {
      bottom: -1px;
    }
  }
  &.euiFlexItem {
    margin: 0 12px 0 0;
  }
`;

const EuiFlexItemWrapper = styled(EuiFlexItem)`
  &.euiFlexItem {
    margin: 0 12px 0 0;
  }
`;

const RoundedBadge = (styled(EuiBadge)`
  align-items: center;
  border-radius: 100%;
  display: inline-flex;
  font-size: 9px;
  height: 34px;
  justify-content: center;
  margin: 0 5px 0 5px;
  padding: 7px 6px 4px 6px;
  user-select: none;
  width: 34px;

  .euiBadge__content {
    position: relative;
    top: -1px;
  }

  .euiBadge__text {
    text-overflow: clip;
  }
` as unknown) as typeof EuiBadge;

RoundedBadge.displayName = 'RoundedBadge';

export type AndOr = 'and' | 'or';

/** Displays AND / OR in a round badge */
// Ref: https://github.com/elastic/eui/issues/1655
export const AndOrBadge = React.memo<{ type: AndOr; includeAntennas?: boolean }>(
  ({ type, includeAntennas = false }) => {
    const getBadge = () => (
      <RoundedBadge data-test-subj="and-or-badge" color="hollow">
        {type === 'and' ? i18n.AND : i18n.OR}
      </RoundedBadge>
    );

    const getBadgeWithAntennas = () => (
      <EuiFlexGroup
        className="andBadgeContainer"
        gutterSize="none"
        direction="column"
        alignItems="center"
      >
        <AndOrBadgeAntenna
          className="topAndOrBadgeAntenna"
          data-test-subj="andOrBadgeBarTop"
          grow={1}
        />
        <EuiFlexItemWrapper grow={false}>{getBadge()}</EuiFlexItemWrapper>
        <AndOrBadgeAntenna
          className="bottomAndOrBadgeAntenna"
          data-test-subj="andOrBadgeBarBottom"
          grow={1}
        />
      </EuiFlexGroup>
    );

    return includeAntennas ? getBadgeWithAntennas() : getBadge();
  }
);

AndOrBadge.displayName = 'AndOrBadge';

export const AddFieldBadge = React.memo(({ onClick }: { onClick: () => void }) => (
  // @ts-ignore
  <RoundedBadge onClick={onClick} data-test-subj="add-field-badge" color="secondary">
    {`+`}
  </RoundedBadge>
));

AddFieldBadge.displayName = 'AddFieldBadge';
