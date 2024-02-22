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
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useRef } from 'react';
import { selectErrorPopoverState, toggleErrorPopoverOpen } from '../../../../state';
import { useErrorDetailsLink } from '../../../common/links/error_details_link';
import { MonitorOverviewItem, OverviewPing } from '../../../../../../../common/runtime_types';
import { isTestRunning, manualTestRunSelector } from '../../../../state/manual_test_runs';
import { useDateFormat } from '../../../../../../hooks/use_date_format';

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
  ping?: OverviewPing;
}) => {
  const testNowRun = useSelector(manualTestRunSelector(monitor.configId));
  const isPopoverOpen = useSelector(selectErrorPopoverState);

  const dispatch = useDispatch();

  const timer = useRef<NodeJS.Timeout | null>(null);

  const setIsPopoverOpen = () => {
    dispatch(toggleErrorPopoverOpen(configIdByLocation));
  };

  const inProgress = isTestRunning(testNowRun);

  const errorLink = useErrorDetailsLink({
    configId: monitor.configId,
    stateId: ping?.state?.id!,
    locationId: monitor.location.id,
  });
  const euiShadow = useEuiShadow('s');

  const formatter = useDateFormat();
  const testTime = formatter(timestamp);

  if (inProgress) {
    return (
      <Container>
        <EuiToolTip position="top" content={TEST_IN_PROGRESS}>
          <EuiLoadingSpinner />
        </EuiToolTip>
      </Container>
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
              onMouseEnter={() => {
                // show popover with delay
                if (timer.current) {
                  clearTimeout(timer.current);
                }
                timer.current = setTimeout(() => {
                  setIsPopoverOpen();
                }, 300);
              }}
              onMouseLeave={() => {
                if (isPopoverOpen) {
                  return;
                } else if (timer.current) {
                  clearTimeout(timer.current);
                }
              }}
              boxShadow={euiShadow}
              onClick={() => {
                if (configIdByLocation === isPopoverOpen) {
                  dispatch(toggleErrorPopoverOpen(null));
                } else {
                  dispatch(toggleErrorPopoverOpen(configIdByLocation));
                }
              }}
            >
              <EuiButtonIcon
                data-test-subj="syntheticsMetricItemIconButton"
                iconType="warning"
                color="danger"
                size="m"
                aria-label={ERROR_DETAILS}
              />
            </StyledIcon>
          }
          isOpen={configIdByLocation === isPopoverOpen}
          closePopover={closePopover}
          anchorPosition="upCenter"
          panelStyle={{
            outline: 'none',
          }}
        >
          <EuiPopoverTitle>
            <EuiFlexGroup>
              <EuiFlexItem grow>{testTime}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  data-test-subj="syntheticsMetricItemIconButton"
                  iconType="cross"
                  onClick={closePopover}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopoverTitle>
          <div style={{ width: '300px' }}>
            <EuiCallOut title={ping?.error?.message} color="danger" iconType="warning" />
          </div>
          <EuiPopoverFooter>
            <EuiButton
              data-test-subj="syntheticsMetricItemIconButton"
              fullWidth
              size="s"
              href={errorLink}
            >
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

const TEST_IN_PROGRESS = i18n.translate('xpack.synthetics.inProgress.label', {
  defaultMessage: 'Manual test run is in progress.',
});

const StyledIcon = euiStyled.div<{ boxShadow: string }>`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
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
