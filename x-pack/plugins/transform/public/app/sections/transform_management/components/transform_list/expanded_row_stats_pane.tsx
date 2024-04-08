/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import {
  EuiLoadingSpinner,
  EuiFlexGroup,
  useEuiTheme,
  EuiCallOut,
  EuiFlexItem,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import type { TransformListRow } from '../../../../common';
import { isTransformListRowWithStats } from '../../../../common/transform_list';

import { useGetTransformStats } from '../../../../hooks';

import type { SectionConfig } from './expanded_row_details_pane';
import { ExpandedRowDetailsPane } from './expanded_row_details_pane';

const NoStatsFallbackTabContent = ({
  transformsStatsLoading,
}: {
  transformsStatsLoading: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  const content = transformsStatsLoading ? (
    <EuiLoadingSpinner />
  ) : (
    <EuiFlexItem grow={true}>
      <EuiCallOut
        size="s"
        color="warning"
        iconType="iInCircle"
        title={
          <FormattedMessage
            id="xpack.transform.transformList.noStatsAvailable"
            defaultMessage="No stats available for this transform."
          />
        }
      />
    </EuiFlexItem>
  );
  return (
    <EuiFlexGroup justifyContent="center" alignItems="center" css={{ height: euiTheme.size.xxxxl }}>
      {content}
    </EuiFlexGroup>
  );
};

function getItemDescription(value: any) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value.toString();
}

interface ExpandedRowStatsPaneProps {
  item: TransformListRow;
}

export const ExpandedRowStatsPane: FC<ExpandedRowStatsPaneProps> = ({ item }) => {
  const { data: fullStats } = useGetTransformStats(item.id, false, true);
  const fullStatsSection: SectionConfig = {
    title: 'Full Stats',
    items: fullStats
      ? Object.entries(fullStats.transforms[0].stats).map((s) => {
          return { title: s[0].toString(), description: getItemDescription(s[1]) };
        })
      : [],
    position: 'right',
  };
  console.log('fullStatsSection', fullStats);

  const basicStatsSection: SectionConfig = {
    title: 'Basic Stats',
    items: isTransformListRowWithStats(item)
      ? Object.entries(item.stats.stats).map((s) => {
          return { title: s[0].toString(), description: getItemDescription(s[1]) };
        })
      : [],
    position: 'left',
  };
  console.log('basicStatsSection', basicStatsSection);

  return isTransformListRowWithStats(item) ? (
    <ExpandedRowDetailsPane
      sections={[basicStatsSection, fullStatsSection]}
      dataTestSubj={'transformStatsTabContent'}
    />
  ) : (
    <NoStatsFallbackTabContent transformsStatsLoading={false} />
  );
};
