/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import { manageQuery } from '../../../../../common/components/page/manage_query';
import type {
  HostsKpiStrategyResponse,
  NetworkKpiStrategyResponse,
} from '../../../../../../common/search_strategy';
import type { StatItemsProps, StatItems } from '../../../../components/stat_items';
import { StatItemsComponent, useKpiMatrixStatus } from '../../../../components/stat_items';
import type { UpdateDateRange } from '../../../../../common/components/charts/common';
import type { UserskKpiStrategyResponse } from '../../../../../../common/search_strategy/security_solution/users';

const kpiWidgetHeight = 247;

export const FlexGroup = styled(EuiFlexGroup)`
  min-height: ${kpiWidgetHeight}px;
`;

FlexGroup.displayName = 'FlexGroup';

interface KpiBaseComponentProps {
  fieldsMapping: Readonly<StatItems[]>;
  data: HostsKpiStrategyResponse | NetworkKpiStrategyResponse | UserskKpiStrategyResponse;
  loading?: boolean;
  id: string;
  from: string;
  to: string;
  updateDateRange: UpdateDateRange;
  setQuerySkip: (skip: boolean) => void;
}

export const KpiBaseComponent = React.memo<KpiBaseComponentProps>(
  ({ fieldsMapping, data, id, loading = false, from, to, updateDateRange, setQuerySkip }) => {
    const statItemsProps: StatItemsProps[] = useKpiMatrixStatus(
      fieldsMapping,
      data,
      id,
      from,
      to,
      updateDateRange,
      setQuerySkip,
      loading
    );

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
    prevProps.id === nextProps.id &&
    prevProps.loading === nextProps.loading &&
    prevProps.from === nextProps.from &&
    prevProps.to === nextProps.to &&
    prevProps.updateDateRange === nextProps.updateDateRange &&
    deepEqual(prevProps.data, nextProps.data)
);

KpiBaseComponent.displayName = 'KpiBaseComponent';

export const KpiBaseComponentManage = manageQuery(KpiBaseComponent);
