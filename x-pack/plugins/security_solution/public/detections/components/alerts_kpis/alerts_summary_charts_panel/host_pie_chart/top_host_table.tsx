/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiPanel, EuiInMemoryTable, EuiProgress, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { ChartsPanelProps, HostData } from '../types';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { getHostTableColumns } from '../columns';
import * as i18n from '../translations';

const TABLE_HEIGHT = 150;

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
  `;
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
              <EuiInMemoryTable columns={columns} items={items} loading={isLoading} />
            </Wrapper>
          )}
          {option === 2 &&
            items.map((item) => (
              <>
                <EuiProgress
                  valueText={true}
                  max={100}
                  color={`vis9`}
                  size="s"
                  value={item.value}
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
          {option === 3 && (
            <Wrapper data-test-subj="alert-detections-table" className="eui-yScroll">
              <EuiInMemoryTable
                columns={columns}
                items={items}
                loading={isLoading}
                tableLayout={'auto'}
              />
            </Wrapper>
          )}
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

TopHostTable.displayName = 'TopHostTable';
