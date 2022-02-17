/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiFlexItem, EuiAccordion, EuiFlexGroup, EuiHideFor } from '@elastic/eui';

import { BoostIcon, ValueBadge } from '../components';
import { BOOST_TYPE_TO_DISPLAY_MAP } from '../constants';
import { Boost } from '../types';

import { BoostItemContent } from './boost_item_content';
import { getBoostSummary } from './get_boost_summary';

interface Props {
  boost: Boost;
  id: string;
  index: number;
  name: string;
}

export const BoostItem: React.FC<Props> = ({ id, boost, index, name }) => {
  const summary = useMemo(() => getBoostSummary(boost), [boost]);

  return (
    <EuiAccordion
      id={id}
      className="boosts__item"
      buttonContentClassName="boosts__itemButton"
      initialIsOpen={!!boost.newBoost}
      buttonContent={
        <EuiFlexGroup responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <BoostIcon type={boost.type} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{BOOST_TYPE_TO_DISPLAY_MAP[boost.type]}</EuiFlexItem>
          <EuiHideFor sizes={['xs', 's', 'm', 'l']}>
            <EuiFlexItem className="eui-textBreakAll">{summary}</EuiFlexItem>
          </EuiHideFor>
          <EuiFlexItem grow={false}>
            <ValueBadge>{boost.factor}</ValueBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      paddingSize="s"
    >
      <BoostItemContent boost={boost} index={index} name={name} />
    </EuiAccordion>
  );
};
