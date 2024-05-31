/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';
import { useCasesFromAlerts } from '../../containers/detection_engine/alerts/use_cases_from_alerts';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { getFieldValue } from './helpers';
import { IsolateHost } from './isolate';
import { UnisolateHost } from './unisolate';
import { useAlertResponseActionsSupport } from '../../../common/hooks/endpoint/use_alert_response_actions_support';

export const HostIsolationPanel = React.memo(
  ({
    details,
    cancelCallback,
    successCallback,
    isolateAction,
  }: {
    details: TimelineEventsDetailsItem[] | null;
    cancelCallback: () => void;
    successCallback?: () => void;
    isolateAction: string;
  }) => {
    const {
      isSupported: alertHostSupportsResponseActions,
      details: { agentId, agentType, hostName },
    } = useAlertResponseActionsSupport(details);

    const alertId = useMemo(
      () => getFieldValue({ category: '_id', field: '_id' }, details),
      [details]
    );

    const { casesInfo } = useCasesFromAlerts({ alertId });

    const formProps: React.ComponentProps<typeof IsolateHost> &
      React.ComponentProps<typeof UnisolateHost> = useMemo(() => {
      return {
        endpointId: agentId,
        hostName,
        casesInfo,
        agentType,
        cancelCallback,
        successCallback,
      };
    }, [agentId, agentType, cancelCallback, casesInfo, hostName, successCallback]);

    if (!alertHostSupportsResponseActions) {
      return (
        <EuiCallOut color="warning">
          <FormattedMessage
            id="xpack.securitySolution.detections.hostIsolation.alertHostNotSupported"
            defaultMessage="The alert's host ({hostName}) does not support host isolation response actions."
            values={{ hostName }}
          />
        </EuiCallOut>
      );
    }

    return isolateAction === 'isolateHost' ? (
      <IsolateHost {...formProps} />
    ) : (
      <UnisolateHost {...formProps} />
    );
  }
);

HostIsolationPanel.displayName = 'HostIsolationContent';
