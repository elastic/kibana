/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { useUiSetting$ } from '../../../../common/lib/kibana';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import type { AlertsCountAggregation } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import {
  getMaxRiskSubAggregations,
  getUpToMaxBuckets,
} from '../alerts_treemap_panel/alerts_treemap/lib/helpers';
import { getFlattenedBuckets } from '../alerts_treemap_panel/alerts_treemap/lib/flatten/get_flattened_buckets';
import type { FlattenedBucket, RawBucket } from '../alerts_treemap_panel/alerts_treemap/types';
import {
  getMultiGroupAlertsCountTableColumns,
  getSingleGroupByAlertsCountTableColumns,
} from './columns';
import { DEFAULT_STACK_BY_FIELD0_SIZE } from './helpers';

interface AlertsCountProps {
  loading: boolean;
  data: AlertSearchResponse<unknown, AlertsCountAggregation>;
  stackByField0: string;
  stackByField1: string | undefined;
}

const Wrapper = styled.div`
  margin-top: -${({ theme }) => theme.eui.euiSizeS};
`;

export const AlertsCountComponent: React.FC<AlertsCountProps> = ({
  data,
  loading,
  stackByField0,
  stackByField1,
}) => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);

  const tableColumns = useMemo(
    () =>
      isEmpty(stackByField1?.trim())
        ? getSingleGroupByAlertsCountTableColumns({
            defaultNumberFormat,
            stackByField0,
          })
        : getMultiGroupAlertsCountTableColumns({
            defaultNumberFormat,
            stackByField0,
            stackByField1,
          }),
    [defaultNumberFormat, stackByField0, stackByField1]
  );

  const buckets: RawBucket[] = useMemo(
    () =>
      getUpToMaxBuckets({
        buckets: data.aggregations?.stackByField0?.buckets,
        maxItems: DEFAULT_STACK_BY_FIELD0_SIZE,
      }),
    [data.aggregations?.stackByField0?.buckets]
  );

  const maxRiskSubAggregations = useMemo(() => getMaxRiskSubAggregations(buckets), [buckets]);

  const items: FlattenedBucket[] = useMemo(
    () =>
      isEmpty(stackByField1?.trim())
        ? buckets
        : getFlattenedBuckets({
            buckets,
            maxRiskSubAggregations,
            stackByField0,
          }),
    [buckets, maxRiskSubAggregations, stackByField0, stackByField1]
  );

  return (
    <Wrapper data-test-subj="alertsCountTable" className="eui-yScroll">
      <EuiInMemoryTable columns={tableColumns} items={items} loading={loading} sorting={true} />
    </Wrapper>
  );
};

AlertsCountComponent.displayName = 'AlertsCountComponent';

export const AlertsCount = React.memo(AlertsCountComponent);
