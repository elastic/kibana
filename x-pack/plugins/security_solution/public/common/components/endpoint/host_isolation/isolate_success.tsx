/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useMemo } from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { GET_ISOLATION_SUCCESS_MESSAGE, GET_UNISOLATION_SUCCESS_MESSAGE } from './translations';
import { useCasesFromAlerts } from '../../../../detections/containers/detection_engine/alerts/use_cases_from_alerts';
import { CaseDetailsLink } from '../../../../common/components/links';

export interface EndpointIsolateSuccessProps {
  hostName: string;
  alertId?: string;
  isolateAction?: 'isolateHost' | 'unisolateHost';
  additionalInfo?: ReactNode;
}

const CasesAdditionalInfo: React.FC<{ alertIdForCase: string }> = ({ alertIdForCase }) => {
  const { casesInfo } = useCasesFromAlerts({ alertId: alertIdForCase });

  const caseCount: number = useMemo(() => casesInfo.length, [casesInfo]);

  const casesList = useMemo(
    () =>
      casesInfo.map((caseInfo, index) => {
        return (
          <li key={caseInfo.id}>
            <CaseDetailsLink detailName={caseInfo.id}>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.hostIsolation.placeholderCase"
                defaultMessage="{caseName}"
                values={{ caseName: caseInfo.title }}
              />
            </CaseDetailsLink>
          </li>
        );
      }),
    [casesInfo]
  );

  return (
    <>
      {caseCount > 0 && (
        <>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.hostIsolation.successfulIsolation.cases"
                defaultMessage="This action has been attached to the following {caseCount, plural, one {case} other {cases}}:"
                values={{ caseCount }}
              />
            </p>
          </EuiText>
          <EuiText size="s">
            <ul>{casesList}</ul>
          </EuiText>
        </>
      )}
    </>
  );
};

export const EndpointIsolateSuccess = memo<EndpointIsolateSuccessProps>(
  ({ hostName, alertId, isolateAction = 'isolateHost', additionalInfo }) => {
    return (
      <EuiCallOut
        iconType="check"
        color="success"
        title={
          isolateAction === 'isolateHost'
            ? GET_ISOLATION_SUCCESS_MESSAGE(hostName)
            : GET_UNISOLATION_SUCCESS_MESSAGE(hostName)
        }
        data-test-subj={
          isolateAction === 'isolateHost'
            ? 'hostIsolateSuccessMessage'
            : 'hostUnisolateSuccessMessage'
        }
      >
        {alertId !== undefined ? CasesAdditionalInfo({ alertIdForCase: alertId }) : additionalInfo}
      </EuiCallOut>
    );
  }
);

EndpointIsolateSuccess.displayName = 'EndpointIsolateSuccess';
