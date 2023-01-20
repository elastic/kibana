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
  EuiIcon,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';
import styled from 'styled-components';
import type { RawBucket } from '../../../common/components/grouping_accordion';
import * as i18n from './translations';

export const StatsContainer = styled.span`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  border-right: ${({ theme }) => theme.eui.euiBorderThin};
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
  padding-right: ${({ theme }) => theme.eui.euiSizeM};
  .smallDot {
    width: 3px !important;
    display: inline-block;
  }
  .euiBadge__text {
    text-align: center;
    width: 100%;
  }
`;

const getSingleGroupSeverity = (severity?: string) => {
  switch (severity) {
    case 'low':
      return (
        <>
          <EuiIcon type="dot" color="#54b399" />
          {i18n.STATS_GROUP_SEVERITY_LOW}
        </>
      );
    case 'medium':
      return (
        <>
          <EuiIcon type="dot" color="#d6bf57" />
          {i18n.STATS_GROUP_SEVERITY_MEDIUM}
        </>
      );
    case 'hight':
      return (
        <>
          <EuiIcon type="dot" color="#da8b45" />
          {i18n.STATS_GROUP_SEVERITY_HIGH}
        </>
      );
    case 'critical':
      return (
        <>
          <EuiIcon type="dot" color="#e7664c" />
          {i18n.STATS_GROUP_SEVERITY_CRITICAL}
        </>
      );
  }
  return null;
};

export const GroupRightPanel = React.memo<{
  bucket: RawBucket;
  actionItems: JSX.Element[];
  onClickOpen?: () => void;
}>(({ bucket, actionItems, onClickOpen }) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const onButtonClick = () => {
    if (!isPopoverOpen && onClickOpen) {
      onClickOpen();
    }
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const takeActionsButton = (
    <EuiButtonEmpty onClick={onButtonClick} iconType="arrowDown" iconSide="right">
      {i18n.TAKE_ACTION}
    </EuiButtonEmpty>
  );

  const singleSeverityComponent =
    bucket.severitiesSubAggregation?.buckets && bucket.severitiesSubAggregation?.buckets?.length
      ? getSingleGroupSeverity(bucket.severitiesSubAggregation?.buckets[0].key)
      : null;

  return (
    <EuiFlexGroup key={`stats-${bucket.key[0]}`} gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <StatsContainer>
          {bucket.countSeveritySubAggregation?.value &&
          bucket.countSeveritySubAggregation?.value > 1 ? (
            <>
              {i18n.STATS_GROUP_SEVERITY}
              <span className="smallDot">
                <EuiIcon type="dot" color="#54b399" />
              </span>
              <span className="smallDot">
                <EuiIcon type="dot" color="#d6bf57" />
              </span>
              <span className="smallDot">
                <EuiIcon type="dot" color="#da8b45" />
              </span>

              <span>
                <EuiIcon type="dot" color="#e7664c" />
              </span>
              {i18n.STATS_GROUP_SEVERITY_MULTI}
            </>
          ) : (
            <>
              {i18n.STATS_GROUP_SEVERITY}
              {singleSeverityComponent}
            </>
          )}
        </StatsContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StatsContainer>
          <>
            {i18n.STATS_GROUP_USERS}
            <EuiToolTip position="top" content={bucket.usersCountAggregation?.value}>
              <EuiBadge color="hollow" style={{ marginLeft: 10, width: 35 }}>
                {bucket.usersCountAggregation?.value && bucket.usersCountAggregation?.value > 99
                  ? '99+'
                  : bucket.usersCountAggregation?.value}
              </EuiBadge>
            </EuiToolTip>
          </>
        </StatsContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StatsContainer>
          <>
            {i18n.STATS_GROUP_HOSTS}
            <EuiToolTip position="top" content={bucket.hostsCountAggregation?.value}>
              <EuiBadge color="hollow" style={{ marginLeft: 10, width: 35 }}>
                {bucket.hostsCountAggregation?.value && bucket.hostsCountAggregation?.value > 99
                  ? '99+'
                  : bucket.hostsCountAggregation?.value}
              </EuiBadge>
            </EuiToolTip>
          </>
        </StatsContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StatsContainer>
          <>
            {i18n.STATS_GROUP_ALERTS}
            <EuiToolTip position="top" content={bucket.doc_count}>
              <EuiBadge style={{ marginLeft: 10, width: 50 }} color="#a83632">
                {bucket.doc_count > 999 ? '999+' : bucket.doc_count}
              </EuiBadge>
            </EuiToolTip>
          </>
        </StatsContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          id="contextMenuExample"
          button={takeActionsButton}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel items={actionItems} />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

GroupRightPanel.displayName = 'GroupRightPanel';
