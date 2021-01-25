/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiLoadingChart } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getNetworkEvents } from '../../../../../state/actions/network_events';
import { networkEventsSelector } from '../../../../../state/selectors';
import { WaterfallChartWrapper } from './waterfall_chart_wrapper';
import { extractItems } from './data_formatting';

export const NO_DATA_TEXT = i18n.translate('xpack.uptime.synthetics.stepDetail.waterfallNoData', {
  defaultMessage: 'No waterfall data could be found for this step',
});

interface Props {
  checkGroup: string;
  stepIndex: number;
}

export const WaterfallChartContainer: React.FC<Props> = ({ checkGroup, stepIndex }) => {
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

  return (
    <>
      {!networkEvents ||
        (networkEvents.loading && (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingChart size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ))}
      {networkEvents && !networkEvents.loading && networkEvents.events.length === 0 && (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem>
            <EuiText textAlign="center">
              <p>{NO_DATA_TEXT}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {networkEvents && !networkEvents.loading && networkEvents.events.length > 0 && (
        <WaterfallChartWrapper
          data={extractItems(networkEvents.events)}
          total={networkEvents.total}
        />
      )}
    </>
  );
};
