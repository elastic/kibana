/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexItem,
  EuiInMemoryTable,
  EuiColorPaletteDisplay,
  EuiSpacer,
  EuiFlexGroup,
  EuiHealth,
  EuiText,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { AlertsTypeData, AlertType } from './types';
import type { SummaryChartsData } from '../alerts_summary_charts_panel/types';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { getAlertsTypeTableColumns } from './columns';
import { ALERT_TYPE_COLOR } from './helpers';

const Wrapper = styled.div`
  margin-top: -${({ theme }) => theme.eui.euiSizeM};
`;
const TableWrapper = styled.div`
  height: 178px;
`;
const StyledEuiColorPaletteDisplay = styled(EuiColorPaletteDisplay)`
  border: none;
  border-radius: 0;
`;
interface PalletteObject {
  stop: number;
  color: string;
}

export interface AlertsByTypeProps {
  items: SummaryChartsData[] | null;
  isLoading: boolean;
}

export const AlertsByType: React.FC<AlertsByTypeProps> = ({ items, isLoading }) => {
  const columns = useMemo(() => getAlertsTypeTableColumns(), []);
  const data = useMemo(() => (items as AlertsTypeData[]) ?? [], [items]);

  const subtotals = useMemo(
    () =>
      data.reduce(
        (acc: { Detection: number; Prevention: number }, item: AlertsTypeData) => {
          if (item.type === 'Detection') {
            acc.Detection += item.value;
          }
          if (item.type === 'Prevention') {
            acc.Prevention += item.value;
          }
          return acc;
        },
        { Detection: 0, Prevention: 0 }
      ),
    [data]
  );

  const palette: PalletteObject[] = useMemo(
    () =>
      (Object.keys(subtotals) as AlertType[]).reduce((acc: PalletteObject[], type: AlertType) => {
        const previousStop = acc.length > 0 ? acc[acc.length - 1].stop : 0;
        if (subtotals[type]) {
          const newEntry: PalletteObject = {
            stop: previousStop + (subtotals[type] || 0),
            color: ALERT_TYPE_COLOR[type],
          };
          acc.push(newEntry);
        }
        return acc;
      }, [] as PalletteObject[]),
    [subtotals]
  );

  const sorting: { sort: { field: keyof AlertsTypeData; direction: SortOrder } } = {
    sort: {
      field: 'value',
      direction: 'desc',
    },
  };

  const pagination: {} = {
    pageSize: 25,
    showPerPageOptions: false,
  };

  return (
    <Wrapper data-test-subj="alerts-by-type">
      <EuiFlexGroup gutterSize="xs" data-test-subj="alerts-by-type-palette-display">
        {(Object.keys(subtotals) as AlertType[]).map((type) => (
          <EuiFlexItem key={type} grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiHealth className="eui-alignMiddle" color={ALERT_TYPE_COLOR[type]}>
                  <EuiText size="xs">
                    <h4>{`${type}:`}</h4>
                  </EuiText>
                </EuiHealth>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <FormattedCount count={subtotals[type] || 0} />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
        <EuiSpacer size="xs" />
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <StyledEuiColorPaletteDisplay size="xs" palette={palette} />

      <EuiSpacer size="xs" />
      <TableWrapper className="eui-yScroll">
        <EuiInMemoryTable
          data-test-subj="alerts-by-type-table"
          columns={columns}
          items={data}
          loading={isLoading}
          sorting={sorting}
          pagination={pagination}
        />
      </TableWrapper>
    </Wrapper>
  );
};

AlertsByType.displayName = 'AlertsByType';
