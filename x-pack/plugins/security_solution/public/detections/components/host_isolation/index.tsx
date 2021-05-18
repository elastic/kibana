/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { find } from 'lodash/fp';
import { EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useHostIsolation } from '../../containers/detection_engine/alerts/use_host_isolation';
import { CASES_ASSOCIATED_WITH_ALERT, RETURN_TO_ALERT_DETAILS } from './translations';
import { Maybe } from '../../../../../observability/common/typings';
import { useCasesFromAlerts } from '../../containers/detection_engine/alerts/use_cases_from_alerts';
import { CaseDetailsLink } from '../../../common/components/links';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import {
  EndpointIsolatedFormProps,
  EndpointIsolateForm,
  EndpointIsolateSuccess,
} from '../../../common/components/endpoint/host_isolation';

export const HostIsolationPanel = React.memo(
  ({
    details,
    cancelCallback,
  }: {
    details: Maybe<TimelineEventsDetailsItem[]>;
    cancelCallback: () => void;
  }) => {
    const [comment, setComment] = useState('');
    const [isIsolated, setIsIsolated] = useState(false);

    const agentId = useMemo(() => {
      const findAgentId = find({ category: 'agent', field: 'agent.id' }, details)?.values;
      return findAgentId ? findAgentId[0] : '';
    }, [details]);

    const hostName = useMemo(() => {
      const findHostName = find({ category: 'host', field: 'host.name' }, details)?.values;
      return findHostName ? findHostName[0] : '';
    }, [details]);

    const alertRule = useMemo(() => {
      const findAlertRule = find({ category: 'signal', field: 'signal.rule.name' }, details)
        ?.values;
      return findAlertRule ? findAlertRule[0] : '';
    }, [details]);

    const alertId = useMemo(() => {
      const findAlertId = find({ category: '_id', field: '_id' }, details)?.values;
      return findAlertId ? findAlertId[0] : '';
    }, [details]);

    const { caseIds } = useCasesFromAlerts({ alertId });
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

    const casesList = useMemo(
      () =>
        caseIds.map((id, index) => {
          return (
            <li>
              <CaseDetailsLink detailName={id}>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.hostIsolation.placeholderCase"
                  defaultMessage="Case {caseIndex}"
                  values={{ caseIndex: index + 1 }}
                />
              </CaseDetailsLink>
            </li>
          );
        }),
      [caseIds]
    );

    const caseCount: number = useMemo(() => caseIds.length, [caseIds]);

    const hostIsolated = useMemo(() => {
      return (
        <>
          <EuiSpacer size="m" />
          <EndpointIsolateSuccess
            hostName={hostName}
            completeButtonLabel={RETURN_TO_ALERT_DETAILS}
            onComplete={backToAlertDetails}
            additionalInfo={
              caseCount > 0 && (
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
              )
            }
          />
        </>
      );
    }, [backToAlertDetails, hostName, caseCount, casesList]);

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

    return isIsolated ? hostIsolated : hostNotIsolated;
  }
);

HostIsolationPanel.displayName = 'HostIsolationContent';
