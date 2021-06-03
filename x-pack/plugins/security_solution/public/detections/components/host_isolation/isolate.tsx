/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback, ReactNode } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useHostIsolation } from '../../containers/detection_engine/alerts/use_host_isolation';
import { CASES_ASSOCIATED_WITH_ALERT, RETURN_TO_ALERT_DETAILS } from './translations';
import {
  EndpointIsolatedFormProps,
  EndpointIsolateForm,
  EndpointIsolateSuccess,
} from '../../../common/components/endpoint/host_isolation';

export const IsolateHost = React.memo(
  ({
    agentId,
    hostName,
    alertRule,
    cases,
    caseIds,
    cancelCallback,
  }: {
    agentId: string;
    hostName: string;
    alertRule: string;
    cases: ReactNode;
    caseIds: string[];
    cancelCallback: () => void;
  }) => {
    const [comment, setComment] = useState('');
    const [isIsolated, setIsIsolated] = useState(false);

    const { loading, isolateHost } = useHostIsolation({ agentId, comment, caseIds });

    const confirmHostIsolation = useCallback(async () => {
      const hostIsolated = await isolateHost();
      setIsIsolated(hostIsolated);
    }, [isolateHost]);

    const backToAlertDetails = useCallback(() => cancelCallback(), [cancelCallback]);

    const handleIsolateFormChange: EndpointIsolatedFormProps['onChange'] = useCallback(
      ({ comment: newComment }) => setComment(newComment),
      []
    );

    const caseCount: number = useMemo(() => caseIds.length, [caseIds]);

    const hostIsolatedSuccess = useMemo(() => {
      return (
        <>
          <EuiSpacer size="m" />
          <EndpointIsolateSuccess
            hostName={hostName}
            isolateAction="isolateHost"
            completeButtonLabel={RETURN_TO_ALERT_DETAILS}
            onComplete={backToAlertDetails}
            additionalInfo={cases}
          />
        </>
      );
    }, [backToAlertDetails, hostName, cases]);

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
                defaultMessage="This action will be added to the {cases}."
                values={{
                  cases: (
                    <b>
                      {caseCount}
                      {CASES_ASSOCIATED_WITH_ALERT(caseCount)}
                      {alertRule}
                    </b>
                  ),
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
      alertRule,
    ]);

    return isIsolated ? hostIsolatedSuccess : hostNotIsolated;
  }
);

IsolateHost.displayName = 'IsolateHost';
