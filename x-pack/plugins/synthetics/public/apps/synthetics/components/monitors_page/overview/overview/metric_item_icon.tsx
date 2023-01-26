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
import { selectErrorPopoverState, toggleErrorPopoverOpen } from '../../../../state';
import { useErrorDetailsLink } from '../../../common/links/error_details_link';
import { MonitorOverviewItem, Ping } from '../../../../../../../common/runtime_types';
import { manualTestRunSelector } from '../../../../state/manual_test_runs';
import { useFormatTestRunAt } from '../../../../utils/monitor_test_result/test_time_formats';

type PopoverPosition = 'relative' | 'default';

interface ActionContainerProps {
  boxShadow: string;
  position: PopoverPosition;
}

const Container = styled.div<ActionContainerProps>`
  display: inline-block;
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 1;
  border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
  ${({ boxShadow, position }) => (position === 'relative' ? boxShadow : '')}
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
      <Container boxShadow={euiShadow} position={'relative'}>
        <EuiPopover
          button={
            <StyledIcon onMouseEnter={() => setIsPopoverOpen()}>
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
            <EuiCallOut title={ping?.error?.message} color="danger" iconType="alert">
              <p />
            </EuiCallOut>
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

const StyledIcon = styled.div`
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
  box-shadow: 0px 0.7px 1.4px rgba(0, 0, 0, 0.07), 0px 1.9px 4px rgba(0, 0, 0, 0.05),
    0px 4.5px 10px rgba(0, 0, 0, 0.05);
  border-radius: 16px;
  flex: none;
  order: 0;
  flex-grow: 0;
`;
