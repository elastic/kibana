/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiProgress, EuiSpacer, EuiText, EuiHorizontalRule } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { AlertsProgressBarData } from './types';
import type { SummaryChartsData } from '../alerts_summary_charts_panel/types';
import { DefaultDraggable } from '../../../../common/components/draggables';

const ProgressWrapper = styled.div`
  height: 160px;
`;

const StyledEuiText = styled(EuiText)`
  margin-top: -${({ theme }) => theme.eui.euiSizeM};
`;

export interface AlertsProcessBarProps {
  items: SummaryChartsData[] | null;
  isLoading: boolean;
  stackByField: string;
  addFilter?: ({ field, value }: { field: string; value: string | number }) => void;
}

export const AlertsProgressBar: React.FC<AlertsProcessBarProps> = ({
  items,
  isLoading,
  stackByField,
}) => {
  const data = useMemo(() => (items as AlertsProgressBarData[]) ?? [], [items]);

  return (
    <>
      <StyledEuiText size="s" data-test-subj="alerts-progress-bar-title">
        <h5>{stackByField}</h5>
      </StyledEuiText>
      <EuiHorizontalRule margin="xs" />
      {!isLoading && data.length === 0 ? (
        <>
          <EuiText size="s" textAlign="center" data-test-subj="empty-proress-bar">
            {'No items found'}
          </EuiText>
          <EuiHorizontalRule margin="xs" />
        </>
      ) : (
        <ProgressWrapper data-test-subj="progress-bar" className="eui-yScroll">
          {data.map((item, i) => (
            <div key={`${item.key}`} data-test-subj={`progress-bar-${item.key}`}>
              <EuiProgress
                valueText={
                  <EuiText size="xs" color="default">
                    <strong>{`${item.percentage}%`}</strong>
                  </EuiText>
                }
                max={100}
                color={`vis9`}
                size="s"
                value={item.percentage}
                label={
                  item.label === 'Other' ? (
                    item.label
                  ) : (
                    <DefaultDraggable
                      isDraggable={false}
                      field={stackByField}
                      hideTopN={true}
                      id={`top-alerts-${item.key}`}
                      value={item.key}
                      queryValue={item.key}
                      tooltipContent={null}
                    >
                      <EuiText size="xs" className="eui-textTruncate">
                        {item.key}
                      </EuiText>
                    </DefaultDraggable>
                  )
                }
              />
              <EuiSpacer size="s" />
            </div>
          ))}
        </ProgressWrapper>
      )}
    </>
  );
};

AlertsProgressBar.displayName = 'AlertsProgressBar';
