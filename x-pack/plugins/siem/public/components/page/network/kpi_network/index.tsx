/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';

import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';
import { EuiSpacer } from '@elastic/eui';
import { chunk as _chunk } from 'lodash/fp';
import {
  StatItemsComponent,
  StatItemsProps,
  useKpiMatrixStatus,
  StatItems,
  KpiValue,
} from '../../../../components/stat_items';
import { KpiNetworkData } from '../../../../graphql/types';
import { fieldTitleMatrixMapping, fieldTitleChartMapping } from './columns';

const kipsPerRow = 2;
const kpiWidgetHeight = 228;

interface KpiNetworkProps {
  data: KpiNetworkData;
  loading: boolean;
}

const FlexGroup = styled(EuiFlexGroup)`
  min-height: ${kpiWidgetHeight}px;
`;

export const KpiNetworkBaseComponent = ({
  fieldsMapping,
  data,
}: {
  fieldsMapping: Readonly<Array<StatItems<KpiValue>>>;
  data: KpiNetworkData;
}) => {
  const statItemsProps: Readonly<Array<StatItemsProps<KpiValue>>> = useKpiMatrixStatus(
    fieldsMapping,
    data
  );

  return (
    <EuiFlexGroup wrap>
      {statItemsProps.map(mappedStatItemProps => {
        return <StatItemsComponent {...mappedStatItemProps} />;
      })}
    </EuiFlexGroup>
  );
};

export const KpiNetworkComponent = React.memo<KpiNetworkProps>(({ data, loading }) => {
  return loading ? (
    <FlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </FlexGroup>
  ) : (
    <EuiFlexGroup wrap>
      <EuiFlexItem grow={1}>
        {_chunk(kipsPerRow, fieldTitleMatrixMapping).map((mappingsPerLine, idx) => (
          <React.Fragment key={`kpi-network-row-${idx}`}>
            {idx % kipsPerRow === 1 && <EuiSpacer size="l" />}
            <KpiNetworkBaseComponent data={data} fieldsMapping={mappingsPerLine} />
          </React.Fragment>
        ))}
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <KpiNetworkBaseComponent data={data} fieldsMapping={fieldTitleChartMapping} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
