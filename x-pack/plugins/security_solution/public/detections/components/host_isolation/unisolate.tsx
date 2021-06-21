/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback, ReactNode } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CASES_ASSOCIATED_WITH_ALERT, RETURN_TO_ALERT_DETAILS } from './translations';
import {
  EndpointIsolatedFormProps,
  EndpointIsolateSuccess,
  EndpointUnisolateForm,
} from '../../../common/components/endpoint/host_isolation';
import { useHostUnisolation } from '../../containers/detection_engine/alerts/use_host_unisolation';

export const UnisolateHost = React.memo(
  ({
    agentId,
    hostName,
    cases,
    caseIds,
    cancelCallback,
  }: {
    agentId: string;
    hostName: string;
    cases: ReactNode;
    caseIds: string[];
    cancelCallback: () => void;
  }) => {
    const [comment, setComment] = useState('');
    const [isUnIsolated, setIsUnIsolated] = useState(false);

    const { loading, unIsolateHost } = useHostUnisolation({ agentId, comment, caseIds });

    const confirmHostUnIsolation = useCallback(async () => {
      const hostIsolated = await unIsolateHost();
      setIsUnIsolated(hostIsolated);
    }, [unIsolateHost]);

    const backToAlertDetails = useCallback(() => cancelCallback(), [cancelCallback]);

    const handleIsolateFormChange: EndpointIsolatedFormProps['onChange'] = useCallback(
      ({ comment: newComment }) => setComment(newComment),
      []
    );

    const caseCount: number = useMemo(() => caseIds.length, [caseIds]);

    const hostUnisolatedSuccess = useMemo(() => {
      return (
        <>
          <EuiSpacer size="m" />
          <EndpointIsolateSuccess
            hostName={hostName}
            isolateAction="unisolateHost"
            completeButtonLabel={RETURN_TO_ALERT_DETAILS}
            onComplete={backToAlertDetails}
            additionalInfo={cases}
          />
        </>
      );
    }, [backToAlertDetails, hostName, cases]);

    const hostNotUnisolated = useMemo(() => {
      return (
        <>
          <EuiSpacer size="m" />
          <EndpointUnisolateForm
            hostName={hostName}
            onCancel={backToAlertDetails}
            onConfirm={confirmHostUnIsolation}
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
      confirmHostUnIsolation,
      handleIsolateFormChange,
      comment,
      loading,
      caseCount,
    ]);

    return isUnIsolated ? hostUnisolatedSuccess : hostNotUnisolated;
  }
);

UnisolateHost.displayName = 'UnisolateHost';
