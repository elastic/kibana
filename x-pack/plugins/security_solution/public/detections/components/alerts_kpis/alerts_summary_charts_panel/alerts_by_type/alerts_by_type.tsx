/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexItem,
  EuiPanel,
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
import type { ChartsPanelProps, DetectionsData, AlertType } from '../types';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { getDetectionsTableColumns } from '../columns';
import * as i18n from '../translations';
import { DETECTION_COLOR } from '../helpers';
import { FormattedCount } from '../../../../../common/components/formatted_number';

const ColorPaletteWrapper = styled.div`
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

export const AlertsByType: React.FC<ChartsPanelProps> = ({ data, isLoading, uniqueQueryId }) => {
  const columns = useMemo(() => getDetectionsTableColumns(), []);
  const items = useMemo(() => (data as DetectionsData[]) ?? [], [data]);
  const subtotals = useMemo(
    () =>
      items.reduce(
        (acc: { Detection: number; Prevention: number }, item: DetectionsData) => {
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
    [items]
  );

  const palette: PalletteObject[] = useMemo(
    () =>
      (Object.keys(subtotals) as AlertType[]).reduce((acc: PalletteObject[], type: AlertType) => {
        const previousStop = acc.length > 0 ? acc[acc.length - 1].stop : 0;
        if (subtotals[type]) {
          const newEntry: PalletteObject = {
            stop: previousStop + (subtotals[type] || 0),
            color: DETECTION_COLOR[type],
          };
          acc.push(newEntry);
        }
        return acc;
      }, [] as PalletteObject[]),
    [subtotals]
  );

  const sorting: { sort: { field: keyof DetectionsData; direction: SortOrder } } = {
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
    <InspectButtonContainer>
      <EuiPanel hasBorder hasShadow={false}>
        <HeaderSection
          id={uniqueQueryId}
          inspectTitle={i18n.ALERTS_TYPE_TITLE}
          outerDirection="row"
          title={i18n.ALERTS_TYPE_TITLE}
          titleSize="xs"
          hideSubtitle
        />
        <ColorPaletteWrapper>
          <EuiFlexGroup gutterSize="xs" data-test-subj="alert-detections-health">
            {(Object.keys(subtotals) as AlertType[]).map((type) => (
              <EuiFlexItem key={type} grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiHealth className="eui-alignMiddle" color={DETECTION_COLOR[type]}>
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
          <StyledEuiColorPaletteDisplay
            className="alert-detections-bar"
            data-test-subj="alert-detections-bar"
            size="xs"
            palette={palette}
          />
        </ColorPaletteWrapper>
        <EuiSpacer size="xs" />
        <TableWrapper className="eui-yScroll">
          <EuiInMemoryTable
            data-test-subj="alert-detections-table"
            columns={columns}
            items={items}
            loading={isLoading}
            sorting={sorting}
            pagination={pagination}
          />
        </TableWrapper>
      </EuiPanel>
    </InspectButtonContainer>
  );
};

AlertsByType.displayName = 'AlertsByType';
