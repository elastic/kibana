/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiHorizontalRule,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import type { ChartsPanelProps, HostData } from '../types';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { DefaultDraggable } from '../../../../../common/components/draggables';
import { HOST_NAME } from '../../../../../common/components/ml/tables/translations';
import { showInitialLoadingSpinner } from '../../alerts_histogram_panel/helpers';
import * as i18n from '../translations';

const ProgressWrapper = styled.div`
  height: 173px;
`;

const StyledEuiText = styled(EuiText)`
  margin-top: -${({ theme }) => theme.eui.euiSizeM};
`;

export const AlertsByHost: React.FC<ChartsPanelProps> = ({ data, isLoading, uniqueQueryId }) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const items = (data as HostData[]) ?? [];

  useEffect(() => {
    let canceled = false;
    if (!canceled && !showInitialLoadingSpinner({ isInitialLoading, isLoadingAlerts: isLoading })) {
      setIsInitialLoading(false);
    }
    return () => {
      canceled = true; // prevent long running data fetches from updating state after unmounting
    };
  }, [isInitialLoading, isLoading, setIsInitialLoading]);

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder hasShadow={false}>
        <HeaderSection
          id={uniqueQueryId}
          inspectTitle={i18n.ALERT_BY_HOST_TITLE}
          outerDirection="row"
          title={i18n.ALERT_BY_HOST_TITLE}
          titleSize="xs"
          hideSubtitle
        />
        <StyledEuiText size="s">
          <h5>{HOST_NAME}</h5>
        </StyledEuiText>
        <EuiHorizontalRule margin="xs" />
        {!isLoading && data === null && (
          <>
            <EuiText size="s" textAlign="center">
              {'No items found'}
            </EuiText>
            <EuiHorizontalRule margin="xs" />
          </>
        )}
        {isInitialLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          <ProgressWrapper data-test-subj="alert-by-host-chart" className="eui-yScroll">
            {items.map((item) => (
              <>
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
                        field={'host.name'}
                        hideTopN={true}
                        id={`alert-by-host-chart-${item.key}`}
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
              </>
            ))}
          </ProgressWrapper>
        )}
      </EuiPanel>
    </InspectButtonContainer>
  );
};

AlertsByHost.displayName = 'AlertsByHost';
