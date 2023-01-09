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
  EuiProgress,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import type { PartialTheme } from '@elastic/charts';
import { Chart, Settings, Axis, BarSeries, Position, ScaleType } from '@elastic/charts';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ChartsPanelProps, HostData } from '../types';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { getHostTableColumns } from '../columns';
import * as i18n from '../translations';

const TABLE_HEIGHT = 200;

export const TopHostTable: React.FC<ChartsPanelProps> = ({
  data,
  isLoading,
  uniqueQueryId,
  option,
}) => {
  const columns = useMemo(() => getHostTableColumns(), []);
  const items = (data as HostData[]) ?? [];
  const Wrapper = styled.div`
    margin-top: -${({ theme }) => theme.eui.euiSizeS};
    @media only screen and (min-width: ${(props) => props.theme.eui.euiBreakpoints.xl}) {
      ${() => `height: ${TABLE_HEIGHT}px;`}
    }
    height: ${TABLE_HEIGHT}px;
  `;

  const sorting: { sort: { field: keyof HostData; direction: SortOrder } } = {
    sort: {
      field: 'value',
      direction: 'desc',
    },
  };

  const { euiTheme } = useEuiTheme();

  const theme: PartialTheme = {
    axes: {
      // axisLine: { visible: false },
      tickLabel: {
        alignment: { horizontal: 'left' },
        fontSize: 12,
        fontFamily: euiTheme.font.family,
        fill: euiTheme.colors.text,
      },
      tickLine: { size: 1 },
    },
  };
  return (
    <EuiFlexItem style={{ minWidth: 350 }}>
      <InspectButtonContainer>
        <EuiPanel>
          <HeaderSection
            id={uniqueQueryId}
            inspectTitle={i18n.ALERT_BY_HOST_TITLE}
            outerDirection="row"
            title={i18n.ALERT_BY_HOST_TITLE}
            titleSize="xs"
            hideSubtitle
          />
          {option === 1 && (
            <Wrapper data-test-subj="alert-detections-table" className="eui-yScroll">
              <EuiInMemoryTable
                columns={columns}
                items={items}
                loading={isLoading}
                sorting={sorting}
              />
            </Wrapper>
          )}
          {option === 2 && (
            <Wrapper data-test-subj="alert-detections-table" className="eui-yScroll">
              {' '}
              {items.map((item) => (
                <>
                  <EuiProgress
                    valueText={true}
                    max={100}
                    color={`vis9`}
                    size="s"
                    value={item.percentage}
                    label={
                      <DefaultDraggable
                        isDraggable={false}
                        field={'host.name'}
                        hideTopN={true}
                        id={`alert-host-table-${item.key}`}
                        value={item.key}
                        queryValue={item.key}
                        tooltipContent={null}
                      />
                    }
                  />
                  <EuiSpacer size="s" />
                </>
              ))}
            </Wrapper>
          )}
          {option === 3 && (
            <Wrapper data-test-subj="alert-host-table" className="eui-yScroll">
              <Chart>
                <Settings showLegend={false} rotation={90} theme={theme} />
                <Axis id="x left" position={Position.Left} />
                <BarSeries
                  id="Count"
                  xScaleType={ScaleType.Ordinal}
                  xAccessor="x"
                  yAccessors={['y']}
                  data={items}
                  color={euiTheme.colors.accentText}
                />
              </Chart>
            </Wrapper>
          )}
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

TopHostTable.displayName = 'TopHostTable';
