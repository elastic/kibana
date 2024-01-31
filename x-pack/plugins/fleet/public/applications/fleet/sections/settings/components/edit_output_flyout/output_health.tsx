/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiCallOut, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { GetOutputHealthResponse } from '../../../../../../../common/types';

import { sendGetOutputHealth, useStartServices } from '../../../../hooks';
import type { Output } from '../../../../types';

interface Props {
  output: Output;
  showBadge?: boolean;
}
const REFRESH_INTERVAL_MS = 10000;

export const OutputHealth: React.FunctionComponent<Props> = ({ output, showBadge }) => {
  const { notifications } = useStartServices();
  const [outputHealth, setOutputHealth] = useState<GetOutputHealthResponse | null>();

  const { data: outputHealthResponse } = useQuery(
    ['outputHealth', output.id],
    () => sendGetOutputHealth(output.id),
    { refetchInterval: REFRESH_INTERVAL_MS }
  );
  useEffect(() => {
    if (outputHealthResponse?.error) {
      notifications.toasts.addError(outputHealthResponse?.error, {
        title: i18n.translate('xpack.fleet.output.errorFetchingOutputHealth', {
          defaultMessage: 'Error fetching output state',
        }),
      });
    }
    setOutputHealth(outputHealthResponse?.data);
  }, [outputHealthResponse, notifications.toasts]);

  const EditOutputStatus: { [status: string]: JSX.Element | null } = {
    DEGRADED: (
      <EuiCallOut
        title="Error"
        color="danger"
        iconType="error"
        data-test-subj="outputHealthDegradedCallout"
      >
        <p className="eui-textBreakWord">
          {i18n.translate('xpack.fleet.output.calloutText', {
            defaultMessage: 'Unable to connect to "{name}" at {host}.',
            values: {
              name: output.name,
              host: output.hosts?.join(',') ?? '',
            },
          })}
        </p>
        <p>
          {i18n.translate('xpack.fleet.output.calloutPromptText', {
            defaultMessage: 'Please check the details are correct.',
          })}
        </p>
      </EuiCallOut>
    ),
    HEALTHY: (
      <EuiCallOut
        title="Healthy"
        color="success"
        iconType="check"
        data-test-subj="outputHealthHealthyCallout"
      >
        <p>
          {i18n.translate('xpack.fleet.output.successCalloutText', {
            defaultMessage: 'Connection with remote output established.',
          })}
        </p>
      </EuiCallOut>
    ),
  };

  const OutputStatusBadge: { [status: string]: JSX.Element | null } = {
    DEGRADED: (
      <EuiBadge color="danger" data-test-subj="outputHealthDegradedBadge">
        <FormattedMessage
          id="xpack.fleet.outputHealth.degradedStatusText"
          defaultMessage="Unhealthy"
        />
      </EuiBadge>
    ),
    HEALTHY: (
      <EuiBadge color="success" data-test-subj="outputHealthHealthyBadge">
        <FormattedMessage
          id="xpack.fleet.outputHealth.healthyStatusText"
          defaultMessage="Healthy"
        />
      </EuiBadge>
    ),
  };

  const msLastTimestamp = new Date(outputHealth?.timestamp || 0).getTime();
  const lastTimestampText = msLastTimestamp ? (
    <>
      <FormattedMessage
        id="xpack.fleet.outputHealth.timestampTooltipText"
        defaultMessage="Last reported {timestamp}"
        values={{
          timestamp: <FormattedRelative value={msLastTimestamp} />,
        }}
      />
    </>
  ) : null;

  const outputBadge = (outputHealth?.state && OutputStatusBadge[outputHealth?.state]) || null;

  return showBadge ? (
    lastTimestampText && outputHealth?.state ? (
      <EuiToolTip
        position="top"
        content={lastTimestampText}
        data-test-subj="outputHealthBadgeTooltip"
      >
        <>{outputBadge} </>
      </EuiToolTip>
    ) : (
      outputBadge
    )
  ) : (
    (outputHealth?.state && EditOutputStatus[outputHealth.state]) || null
  );
};
