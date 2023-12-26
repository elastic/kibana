/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { SENTINELONE_CONNECTOR_ID, SUB_ACTION } from '@kbn/stack-connectors-plugin/public/common';
import { useLoadConnectors } from '../../../common/components/response_actions/use_load_connectors';
import { useSubActionMutation } from '../../../timelines/components/side_panel/event_details/flyout/use_sub_action_mutation';
import { RETURN_TO_ALERT_DETAILS } from './translations';
import {
  EndpointIsolateForm,
  ActionCompletionReturnButton,
} from '../../../common/components/endpoint/host_isolation';

export const IsolateSentinelOneHost = React.memo(
  ({
    sentinelOneAgentId,
    hostName,
    cancelCallback,
    successCallback,
  }: {
    sentinelOneAgentId: string;
    hostName: string;
    cancelCallback: () => void;
    successCallback?: () => void;
  }) => {
    const { data: connectors } = useLoadConnectors({ actionTypeId: SENTINELONE_CONNECTOR_ID });
    const connector = useMemo(() => connectors?.[0], [connectors]);

    const [isIsolated, setIsIsolated] = useState(false);

    const { mutateAsync: isolateHost, isLoading } = useSubActionMutation({
      connectorId: connector?.id as string,
      subAction: SUB_ACTION.ISOLATE_HOST,
      subActionParams: {
        uuid: sentinelOneAgentId,
      },
    });

    const onChange = useCallback(() => {}, []);

    const confirmHostIsolation = useCallback(async () => {
      const response = await isolateHost();

      if (response.status === 'ok') {
        setIsIsolated(true);

        if (successCallback) {
          successCallback();
        }
      }
    }, [isolateHost, successCallback]);

    const backToAlertDetails = useCallback(() => cancelCallback(), [cancelCallback]);

    const hostIsolatedSuccessButton = useMemo(
      () => (
        <ActionCompletionReturnButton
          onClick={backToAlertDetails}
          buttonText={RETURN_TO_ALERT_DETAILS}
        />
      ),
      [backToAlertDetails]
    );

    const hostNotIsolated = useMemo(
      () => (
        <>
          <EuiSpacer size="m" />
          <EndpointIsolateForm
            hostName={hostName}
            onCancel={backToAlertDetails}
            onConfirm={confirmHostIsolation}
            isLoading={isLoading}
            onChange={onChange}
            hideCommentField
          />
        </>
      ),
      [hostName, backToAlertDetails, confirmHostIsolation, isLoading, onChange]
    );

    return isIsolated ? hostIsolatedSuccessButton : hostNotIsolated;
  }
);

IsolateSentinelOneHost.displayName = 'IsolateSentinelOneHost';
