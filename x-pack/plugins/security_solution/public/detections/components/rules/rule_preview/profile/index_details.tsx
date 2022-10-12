/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiToolTip, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiBadge } from '@elastic/eui';

import { msToPretty } from './ms_to_pretty';
import type { Index } from './types';

export interface Props {
  index: Index;
}

export const IndexDetails = ({ index }: Props) => {
  const { time, name } = index;
  const { time: cumulativeTime, badgeColor } = msToPretty(time, 3);
  return (
    <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" direction="row">
      {/* Index Title group */}
      <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
        <EuiTitle size="xxs" className="prfDevTool__profileTree__shardDetails">
          <h4>{name}</h4>
        </EuiTitle>
      </EuiFlexItem>
      {/* Time details group */}
      <EuiFlexItem grow={false} className="prfDevTool__profileTree__indexDetails">
        <EuiText size="s" className="prfDevTool__profileTree__shardDetails--dim">
          <EuiToolTip
            position="bottom"
            content={i18n.translate('xpack.searchProfiler.profileTree.cumulativeTimeTooltip', {
              defaultMessage:
                'The cumulative time of all shards in the index. Note: this is not wall-clock time, as shards can execute in parallel.',
            })}
          >
            <EuiBadge color={badgeColor}>{` ${cumulativeTime}`}</EuiBadge>
          </EuiToolTip>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
