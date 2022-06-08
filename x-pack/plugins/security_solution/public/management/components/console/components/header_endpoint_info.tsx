/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useGetEndpointDetails } from '../../../hooks';
import { EndpointAgentAndIsolationStatus } from '../../endpoint_agent_and_isolation_status';
import { HOST_STATUS_TO_HEALTH_COLOR } from '../../../pages/endpoint_hosts/view/host_constants';
import { useGetEndpointPendingActionsSummary } from '../../../hooks/endpoint/use_get_endpoint_pending_actions_summary';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { EndpointHostIsolationStatusProps } from '../../../../common/components/endpoint/host_isolation';

interface HeaderEndpointInfoProps {
  endpointId: string;
}

export const HeaderEndpointInfo = memo<HeaderEndpointInfoProps>(({ endpointId }) => {
  const { data: endpointDetails } = useGetEndpointDetails(endpointId, { refetchInterval: 10000 });
  const { data: endpointPendingActions } = useGetEndpointPendingActionsSummary([endpointId], {
    refetchInterval: 10000,
  });

  const pendingIsolationActions = useMemo<
    Pick<Required<EndpointHostIsolationStatusProps>, 'pendingIsolate' | 'pendingUnIsolate'>
  >(() => {
    if (endpointPendingActions?.data.length) {
      const pendingActions = endpointPendingActions.data[0].pending_actions;

      return {
        pendingIsolate: pendingActions.isolate ?? 0,
        pendingUnIsolate: pendingActions.unisolate ?? 0,
      };
    }
    return {
      pendingIsolate: 0,
      pendingUnIsolate: 0,
    };
  }, [endpointPendingActions?.data]);

  if (!endpointDetails) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiHealth
              color={HOST_STATUS_TO_HEALTH_COLOR[endpointDetails.host_status]}
              data-test-subj="consoleHeaderEndpointHealth"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <h6>
                <FormattedMessage
                  id="xpack.securitySolution.console.header.endpointTitle"
                  defaultMessage="ENDPOINT"
                />
              </h6>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="success" size="s">
              <h6>{endpointDetails.metadata.host.name}</h6>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EndpointAgentAndIsolationStatus
              status={endpointDetails.host_status}
              isIsolated={endpointDetails.metadata.Endpoint.state?.isolation}
              {...pendingIsolationActions}
              data-test-subj="consoleHeaderEndpointIsolationStatus"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="s">
          <FormattedMessage
            id="xpack.securitySolution.console.header.lastSeen"
            defaultMessage="Last seen "
          />
          <FormattedDate
            fieldName={i18n.translate('xpack.securitySolution.console.header.lastSeen.date', {
              defaultMessage: 'Last seen',
            })}
            value={endpointDetails.metadata['@timestamp']}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

HeaderEndpointInfo.displayName = 'HeaderEndpointInfo';
