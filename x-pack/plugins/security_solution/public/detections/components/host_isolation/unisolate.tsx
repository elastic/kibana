/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CASES_ASSOCIATED_WITH_ALERT, RETURN_TO_ALERT_DETAILS } from './translations';
import {
  EndpointIsolatedFormProps,
  EndpointUnisolateForm,
  ActionCompletionReturnButton,
} from '../../../common/components/endpoint/host_isolation';
import { useHostUnisolation } from '../../containers/detection_engine/alerts/use_host_unisolation';
import { CasesFromAlertsResponse } from '../../containers/detection_engine/alerts/types';

export const UnisolateHost = React.memo(
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
    const [isUnIsolated, setIsUnIsolated] = useState(false);

    const caseIds: string[] = casesInfo.map((caseInfo): string => {
      return caseInfo.id;
    });

    const { loading, unIsolateHost } = useHostUnisolation({ endpointId, comment, caseIds });

    const confirmHostUnIsolation = useCallback(async () => {
      const hostUnIsolated = await unIsolateHost();
      setIsUnIsolated(hostUnIsolated);

      if (hostUnIsolated && successCallback) {
        successCallback();
      }
    }, [successCallback, unIsolateHost]);

    const backToAlertDetails = useCallback(() => cancelCallback(), [cancelCallback]);

    const handleIsolateFormChange: EndpointIsolatedFormProps['onChange'] = useCallback(
      ({ comment: newComment }) => setComment(newComment),
      []
    );

    const caseCount: number = useMemo(() => casesInfo.length, [casesInfo]);

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

    return isUnIsolated ? hostUnisolatedSuccessButton : hostNotUnisolated;
  }
);

UnisolateHost.displayName = 'UnisolateHost';
