/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';
import type { BadgeMetric, CustomMetric } from '.';
import { StatsContainer } from '../styles';
import { TAKE_ACTION } from '../translations';
import type { RawBucket } from '../types';

interface GroupStatsProps {
  bucket: RawBucket;
  takeActionItems: JSX.Element[];
  onTakeActionsOpen?: () => void;
  badgeMetricStats?: BadgeMetric[];
  customMetricStats?: CustomMetric[];
}

const GroupStatsComponent = ({
  bucket,
  badgeMetricStats,
  customMetricStats,
  takeActionItems,
  onTakeActionsOpen,
}: GroupStatsProps) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = () => {
    if (!isPopoverOpen && onTakeActionsOpen) {
      onTakeActionsOpen();
    }
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const takeActionsButton = (
    <EuiButtonEmpty onClick={onButtonClick} iconType="arrowDown" iconSide="right">
      {TAKE_ACTION}
    </EuiButtonEmpty>
  );

  const badgesComponents = badgeMetricStats?.map((metric) => (
    <EuiFlexItem grow={false}>
      <StatsContainer>
        <>
          {metric.title}
          <EuiToolTip position="top" content={metric.value}>
            <EuiBadge
              style={{ marginLeft: 10, width: metric.width ?? 35 }}
              color={metric.color ?? 'hollow'}
            >
              {metric.value > 99 ? '99+' : metric.value}
            </EuiBadge>
          </EuiToolTip>
        </>
      </StatsContainer>
    </EuiFlexItem>
  ));

  const customComponents = customMetricStats?.map((customMetric) => (
    <EuiFlexItem grow={false}>
      <StatsContainer>
        <>
          {customMetric.title}
          {customMetric.customStatRenderer}
        </>
      </StatsContainer>
    </EuiFlexItem>
  ));

  return (
    <EuiFlexGroup key={`stats-${bucket.key[0]}`} gutterSize="s" alignItems="center">
      {customComponents}
      {badgesComponents}
      <EuiFlexItem grow={false}>
        <EuiPopover
          id="contextMenuExample"
          button={takeActionsButton}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel items={takeActionItems} />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const GroupStats = React.memo(GroupStatsComponent);
