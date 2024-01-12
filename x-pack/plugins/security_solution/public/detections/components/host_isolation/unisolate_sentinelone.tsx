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
  EndpointUnisolateForm,
  ActionCompletionReturnButton,
} from '../../../common/components/endpoint/host_isolation';

export const UnisolateSentinelOneHost = React.memo(
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
    const [isUnIsolated, setIsUnIsolated] = useState(false);
    const { data: connectors } = useLoadConnectors({ actionTypeId: SENTINELONE_CONNECTOR_ID });
    const connector = useMemo(() => connectors?.[0], [connectors]);

    const { mutateAsync: unIsolateHost, isLoading } = useSubActionMutation({
      // @ts-expect-error update types
      connectorId: connector?.id,
      subAction: SUB_ACTION.RELEASE_HOST,
      subActionParams: {
        uuid: sentinelOneAgentId,
      },
    });

    const confirmHostUnIsolation = useCallback(async () => {
      const response = await unIsolateHost();

      if (response.status === 'ok') {
        setIsUnIsolated(true);

        if (successCallback) {
          successCallback();
        }
      }
    }, [successCallback, unIsolateHost]);

    const onChange = useCallback(() => {}, []);

    const backToAlertDetails = useCallback(() => cancelCallback(), [cancelCallback]);

    const hostUnisolatedSuccessButton = useMemo(() => {
      return (
        <ActionCompletionReturnButton
          onClick={backToAlertDetails}
          buttonText={RETURN_TO_ALERT_DETAILS}
        />
      );
    }, [backToAlertDetails]);

    const hostNotUnisolated = useMemo(() => {
      return (
        <>
          <EuiSpacer size="m" />
          <EndpointUnisolateForm
            hostName={hostName}
            onCancel={backToAlertDetails}
            onConfirm={confirmHostUnIsolation}
            onChange={onChange}
            isLoading={isLoading}
            hideCommentField
          />
        </>
      );
    }, [hostName, backToAlertDetails, confirmHostUnIsolation, onChange, isLoading]);

    return isUnIsolated ? hostUnisolatedSuccessButton : hostNotUnisolated;
  }
);

UnisolateSentinelOneHost.displayName = 'UnisolateSentinelOneHost';
