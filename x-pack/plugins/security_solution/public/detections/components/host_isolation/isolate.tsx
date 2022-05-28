/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHostIsolation } from '../../containers/detection_engine/alerts/use_host_isolation';
import { CASES_ASSOCIATED_WITH_ALERT, RETURN_TO_ALERT_DETAILS } from './translations';
import {
  EndpointIsolatedFormProps,
  EndpointIsolateForm,
  ActionCompletionReturnButton,
} from '../../../common/components/endpoint/host_isolation';
import { CasesFromAlertsResponse } from '../../containers/detection_engine/alerts/types';

export const IsolateHost = React.memo(
  ({
    endpointId,
    hostName,
    casesInfo,
    cancelCallback,
    successCallback,
  }: {
    endpointId: string;
    hostName: string;
    casesInfo: CasesFromAlertsResponse;
    cancelCallback: () => void;
    successCallback?: () => void;
  }) => {
    const [comment, setComment] = useState('');
    const [isIsolated, setIsIsolated] = useState(false);

    const caseIds: string[] = casesInfo.map((caseInfo): string => {
      return caseInfo.id;
    });

    const { loading, isolateHost } = useHostIsolation({ endpointId, comment, caseIds });

    const confirmHostIsolation = useCallback(async () => {
      const hostIsolated = await isolateHost();
      setIsIsolated(hostIsolated);

      if (hostIsolated && successCallback) {
        successCallback();
      }
    }, [isolateHost, successCallback]);

    const backToAlertDetails = useCallback(() => cancelCallback(), [cancelCallback]);

    const handleIsolateFormChange: EndpointIsolatedFormProps['onChange'] = useCallback(
      ({ comment: newComment }) => setComment(newComment),
      []
    );

    const caseCount: number = useMemo(() => casesInfo.length, [casesInfo]);

    const hostIsolatedSuccessButton = useMemo(() => {
      return (
        <ActionCompletionReturnButton
          onClick={backToAlertDetails}
          buttonText={RETURN_TO_ALERT_DETAILS}
        />
      );
    }, [backToAlertDetails]);

    const hostNotIsolated = useMemo(() => {
      return (
        <>
          <EuiSpacer size="m" />
          <EndpointIsolateForm
            hostName={hostName}
            onCancel={backToAlertDetails}
            onConfirm={confirmHostIsolation}
            onChange={handleIsolateFormChange}
            comment={comment}
            isLoading={loading}
            messageAppend={
              <FormattedMessage
                id="xpack.securitySolution.detections.hostIsolation.impactedCases"
                defaultMessage="This action will be added to {cases}."
                values={{
                  cases: <b>{CASES_ASSOCIATED_WITH_ALERT(caseCount)}</b>,
                }}
              />
            }
          />
        </>
      );
    }, [
      hostName,
      backToAlertDetails,
      confirmHostIsolation,
      handleIsolateFormChange,
      comment,
      loading,
      caseCount,
    ]);

    return isIsolated ? hostIsolatedSuccessButton : hostNotIsolated;
  }
);

IsolateHost.displayName = 'IsolateHost';
