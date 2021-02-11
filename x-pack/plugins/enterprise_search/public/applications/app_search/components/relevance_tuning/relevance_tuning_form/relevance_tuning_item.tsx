/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiTextColor, EuiIcon } from '@elastic/eui';

import { SchemaTypes } from '../../../../shared/types';

import { BoostIcon } from '../boost_icon';
import { Boost, SearchField } from '../types';

import { ValueBadge } from './value_badge';

interface Props {
  name: string;
  type: SchemaTypes;
  boosts?: Boost[];
  field?: SearchField;
}

export const RelevanceTuningItem: React.FC<Props> = ({ name, type, boosts = [], field }) => {
  return (
    <EuiFlexGroup alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>{name}</h3>
        </EuiTitle>
        <EuiText>
          <EuiTextColor color="subdued">{type}</EuiTextColor>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          justifyContent="flexEnd"
          responsive={false}
          wrap
        >
          {boosts.map((boost, index) => (
            <EuiFlexItem grow={false} key={index}>
              <BoostIcon type={boost.type} />
            </EuiFlexItem>
          ))}
          <EuiFlexItem grow={false}>
            <ValueBadge disabled={!field || field.weight === 0}>
              <EuiIcon type="controlsVertical" size="m" />
              <span>{!!field ? field.weight : 0}</span>
            </ValueBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
