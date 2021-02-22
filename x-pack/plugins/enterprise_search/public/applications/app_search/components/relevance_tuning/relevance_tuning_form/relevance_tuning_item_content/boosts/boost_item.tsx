/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiFlexItem, EuiAccordion, EuiFlexGroup, EuiHideFor } from '@elastic/eui';

import { BoostIcon } from '../../../boost_icon';
import { BOOST_TYPE_TO_DISPLAY_MAP } from '../../../constants';
import { Boost } from '../../../types';
import { ValueBadge } from '../../value_badge';

import { getBoostSummary } from './get_boost_summary';

interface Props {
  boost: Boost;
  id: string;
}

export const BoostItem: React.FC<Props> = ({ id, boost }) => {
  const summary = useMemo(() => getBoostSummary(boost), [boost]);

  return (
    <EuiAccordion
      id={id}
      className="boosts__item"
      buttonContentClassName="boosts__itemContent"
      buttonContent={
        <EuiFlexGroup responsive={false} wrap>
          <EuiFlexItem>
            <EuiFlexGroup responsive={false}>
              <EuiFlexItem grow={false}>
                <BoostIcon type={boost.type} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{BOOST_TYPE_TO_DISPLAY_MAP[boost.type]}</EuiFlexItem>
              <EuiHideFor sizes={['xs', 's', 'm', 'l']}>
                <EuiFlexItem>{summary}</EuiFlexItem>
              </EuiHideFor>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ValueBadge>{boost.factor}</ValueBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      paddingSize="s"
    />
  );
};
