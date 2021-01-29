/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiLoadingSpinner, EuiFlexGroup } from '@elastic/eui';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import { manageQuery } from '../../../../common/components/page/manage_query';
import { NetworkKpiStrategyResponse } from '../../../../../common/search_strategy';
import {
  StatItemsComponent,
  StatItemsProps,
  useKpiMatrixStatus,
  StatItems,
} from '../../../../common/components/stat_items';
import { UpdateDateRange } from '../../../../common/components/charts/common';

const kpiWidgetHeight = 228;

export const FlexGroup = styled(EuiFlexGroup)`
  min-height: ${kpiWidgetHeight}px;
`;

FlexGroup.displayName = 'FlexGroup';

export const NetworkKpiBaseComponent = React.memo<{
  fieldsMapping: Readonly<StatItems[]>;
  data: NetworkKpiStrategyResponse;
  loading?: boolean;
  id: string;
  from: string;
  to: string;
  narrowDateRange: UpdateDateRange;
}>(
  ({ fieldsMapping, data, id, loading = false, from, to, narrowDateRange }) => {
    const statItemsProps: StatItemsProps[] = useKpiMatrixStatus(
      fieldsMapping,
      data,
      id,
      from,
      to,
      narrowDateRange
    );

    if (loading) {
      return (
        <FlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </FlexGroup>
      );
    }

    return (
      <EuiFlexGroup wrap>
        {statItemsProps.map((mappedStatItemProps) => (
          <StatItemsComponent {...mappedStatItemProps} />
        ))}
      </EuiFlexGroup>
    );
  },
  (prevProps, nextProps) =>
    prevProps.fieldsMapping === nextProps.fieldsMapping &&
    prevProps.loading === nextProps.loading &&
    prevProps.id === nextProps.id &&
    prevProps.from === nextProps.from &&
    prevProps.to === nextProps.to &&
    prevProps.narrowDateRange === nextProps.narrowDateRange &&
    deepEqual(prevProps.data, nextProps.data)
);

NetworkKpiBaseComponent.displayName = 'NetworkKpiBaseComponent';

export const NetworkKpiBaseComponentManage = manageQuery(NetworkKpiBaseComponent);
