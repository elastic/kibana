/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiLoadingChart, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getNetworkEvents } from '../../../../../state/actions/network_events';
import { networkEventsSelector } from '../../../../../state/selectors';
import { WaterfallChartWrapper } from './waterfall_chart_wrapper';
import { extractItems } from './data_formatting';
import { useStepWaterfallMetrics } from '../use_step_waterfall_metrics';
import { JourneyStep } from '../../../../../../common/runtime_types';

export const NO_DATA_TEXT = i18n.translate('xpack.uptime.synthetics.stepDetail.waterfallNoData', {
  defaultMessage: 'No waterfall data could be found for this step',
});

interface Props {
  checkGroup: string;
  activeStep?: JourneyStep;
  stepIndex: number;
}

export const WaterfallChartContainer: React.FC<Props> = ({ checkGroup, stepIndex, activeStep }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (checkGroup && stepIndex) {
      dispatch(
        getNetworkEvents({
          checkGroup,
          stepIndex,
        })
      );
    }
  }, [dispatch, stepIndex, checkGroup]);

  const _networkEvents = useSelector(networkEventsSelector);
  const networkEvents = _networkEvents[checkGroup ?? '']?.[stepIndex];
  const waterfallLoaded = networkEvents && !networkEvents.loading;
  const isWaterfallSupported = networkEvents?.isWaterfallSupported;
  const hasEvents = networkEvents?.events?.length > 0;

  const { metrics } = useStepWaterfallMetrics({
    checkGroup,
    stepIndex,
    hasNavigationRequest: networkEvents?.hasNavigationRequest,
  });

  return (
    <>
      {!waterfallLoaded && (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingChart
              size="xl"
              aria-label={i18n.translate('xpack.uptime.synthetics.stepDetail.waterfall.loading', {
                defaultMessage: 'Waterfall chart loading',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {waterfallLoaded && !hasEvents && (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem>
            <EuiText textAlign="center">
              <p>{NO_DATA_TEXT}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {waterfallLoaded && hasEvents && isWaterfallSupported && (
        <WaterfallChartWrapper
          data={extractItems(networkEvents.events)}
          markerItems={metrics}
          total={networkEvents.total}
          activeStep={activeStep}
        />
      )}
      {waterfallLoaded && hasEvents && !isWaterfallSupported && (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.uptime.synthetics.stepDetail.waterfallUnsupported.title"
              defaultMessage="Waterfall chart unavailable"
            />
          }
          color="warning"
          iconType="help"
        >
          <FormattedMessage
            id="xpack.uptime.synthetics.stepDetail.waterfallUnsupported.description"
            defaultMessage="The waterfall chart cannot be shown. You may be using an older version of the Synthetic Agent. Please check the version and consider upgrading."
          />
        </EuiCallOut>
      )}
    </>
  );
};
