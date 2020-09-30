/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext, useEffect, useState } from 'react';
import styled, { ThemeContext } from 'styled-components';
import { EuiFlexItem } from '@elastic/eui';
import { EuiPanel } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { WithHeaderLayout } from '../../components/app/layout/with_header';
import {
  useApmHasData,
  useInfraLogsHasData,
  useInfraMetricsHasData,
  useUptimeHasData,
  useUxHasData,
} from '../../data_handler';
import { ObsvSharedContext } from '../../context/shared_data';

const CentralizedFlexGroup = styled(EuiFlexGroup)`
  justify-content: center;
  align-items: center;
  // place the element in the center of the page
  min-height: calc(100vh - ${(props) => props.theme.eui.euiHeaderChildSize});
`;

export function LoadingObservability() {
  const [allLoaded, setAllLoaded] = useState(false);
  const theme = useContext(ThemeContext);

  const { setSharedData } = useContext(ObsvSharedContext);

  const history = useHistory();

  const { data: logs, status: logsStatus } = useInfraLogsHasData();
  const { data: metrics, status: metricsStatus } = useInfraMetricsHasData();
  const { data: apm, status: apmStatus } = useApmHasData();
  const { data: uptime, status: uptimeStatus } = useUptimeHasData();
  const { data: ux, status: uxStatus } = useUxHasData();

  useEffect(() => {
    const hasAnyData = logs || metrics || apm || uptime || ux;

    if (hasAnyData) {
      setAllLoaded(true);
      history.push({ pathname: '/overview' });
    } else if (
      logsStatus === 'success' &&
      metricsStatus === 'success' &&
      apmStatus === 'success' &&
      uptimeStatus === 'success' &&
      uxStatus === 'success'
    ) {
      history.push({ pathname: '/landing' });
      setAllLoaded(true);
    }

    const hasData = {
      infra_logs: logs,
      infra_metrics: metrics,
      apm,
      uptime,
      ux,
    };

    setSharedData({ hasData, hasAnyData });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, metrics, apm, uptime, ux, history]);

  return !allLoaded ? (
    <WithHeaderLayout
      headerColor={theme.eui.euiColorEmptyShade}
      bodyColor={theme.eui.euiPageBackgroundColor}
      showAddData
      showGiveFeedback
    >
      <CentralizedFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiPanel>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
                <EuiText>
                  {i18n.translate('xpack.observability.overview.loadingObservability', {
                    defaultMessage: 'Loading Observability',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </CentralizedFlexGroup>
    </WithHeaderLayout>
  ) : null;
}
