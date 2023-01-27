/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import {
  EuiLoadingSpinner,
  EuiToolTip,
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiButton,
  useEuiShadow,
  EuiCallOut,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { selectErrorPopoverState, toggleErrorPopoverOpen } from '../../../../state';
import { useErrorDetailsLink } from '../../../common/links/error_details_link';
import { MonitorOverviewItem, Ping } from '../../../../../../../common/runtime_types';
import { manualTestRunSelector } from '../../../../state/manual_test_runs';
import { useFormatTestRunAt } from '../../../../utils/monitor_test_result/test_time_formats';

const Container = styled.div`
  display: inline-block;
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 1;
`;

export const MetricItemIcon = ({
  monitor,
  status,
  ping,
  timestamp,
  configIdByLocation,
}: {
  monitor: MonitorOverviewItem;
  status: string;
  configIdByLocation: string;
  timestamp?: string;
  ping?: Ping;
}) => {
  const testNowRun = useSelector(manualTestRunSelector(monitor.configId));
  const isPopoverOpen = useSelector(selectErrorPopoverState);

  const dispatch = useDispatch();

  const setIsPopoverOpen = () => {
    dispatch(toggleErrorPopoverOpen(configIdByLocation));
  };

  const inProgress = testNowRun?.status === 'in-progress' || testNowRun?.status === 'loading';

  const errorLink = useErrorDetailsLink({ configId: monitor.configId, stateId: ping?.state?.id! });
  const euiShadow = useEuiShadow('l');

  const testTime = useFormatTestRunAt(timestamp);

  if (inProgress) {
    return (
      <EuiToolTip position="top" content="Test is in progress">
        <EuiLoadingSpinner />
      </EuiToolTip>
    );
  }

  const closePopover = () => {
    dispatch(toggleErrorPopoverOpen(null));
  };

  if (status === 'down') {
    return (
      <Container>
        <EuiPopover
          button={
            <StyledIcon
              onMouseEnter={() => setIsPopoverOpen()}
              boxShadow={euiShadow}
              onClick={() => {
                if (configIdByLocation === isPopoverOpen) {
                  dispatch(toggleErrorPopoverOpen(null));
                } else {
                  dispatch(toggleErrorPopoverOpen(configIdByLocation));
                }
              }}
            >
              <EuiButtonIcon iconType="alert" color="danger" size="m" />
            </StyledIcon>
          }
          isOpen={configIdByLocation === isPopoverOpen}
          closePopover={closePopover}
          anchorPosition="upCenter"
          panelStyle={{
            outline: 'none',
          }}
        >
          <EuiPopoverTitle>{testTime}</EuiPopoverTitle>
          <div style={{ width: '300px' }}>
            <EuiCallOut title={ping?.error?.message} color="danger" iconType="alert" />
          </div>
          <EuiPopoverFooter>
            <EuiButton fullWidth size="s" href={errorLink}>
              {ERROR_DETAILS}
            </EuiButton>
          </EuiPopoverFooter>
        </EuiPopover>
      </Container>
    );
  } else {
    return null;
  }
};

const ERROR_DETAILS = i18n.translate('xpack.synthetics.errorDetails.label', {
  defaultMessage: 'Error details',
});

const StyledIcon = euiStyled.div<{ boxShadow: string }>`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  gap: 10px;
  width: 32px;
  height: 32px;
  background: #ffffff;
  border: 1px solid #d3dae6;
  ${({ boxShadow }) => boxShadow}
  border-radius: 16px;
  flex: none;
  order: 0;
  flex-grow: 0;
`;
