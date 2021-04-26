/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { find } from 'lodash/fp';
import {
  EuiCallOut,
  EuiTitle,
  EuiText,
  EuiTextArea,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useHostIsolation } from '../../containers/detection_engine/alerts/use_host_isolation';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import {
  CANCEL,
  CASES_ASSOCIATED_WITH_ALERT,
  COMMENT,
  COMMENT_PLACEHOLDER,
  CONFIRM,
  RETURN_TO_ALERT_DETAILS,
} from './translations';
import { Maybe } from '../../../../../observability/common/typings';

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

    const { loading, isolateHost } = useHostIsolation({ agentId, comment });

    const confirmHostIsolation = useCallback(async () => {
      const hostIsolated = await isolateHost();
      setIsIsolated(hostIsolated);
    }, [isolateHost]);

    const backToAlertDetails = useCallback(() => cancelCallback(), [cancelCallback]);

    // a placeholder until we get the case count returned from a new case route in a future pr
    const caseCount: number = 0;

    const hostIsolated = useMemo(() => {
      return (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            iconType="check"
            color="success"
            title={i18n.translate(
              'xpack.securitySolution.endpoint.hostIsolation.successfulIsolation.title',
              {
                defaultMessage: 'Host Isolation on {hostname} successfully submitted',
                values: { hostname: hostName },
              }
            )}
          >
            {caseCount > 0 && (
              <>
                <EuiText size="s">
                  <p>
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.hostIsolation.successfulIsolation.cases"
                      defaultMessage="This case has been attached to the following {caseCount, plural, one {case} other {cases}}:"
                      values={{ caseCount }}
                    />
                  </p>
                </EuiText>
                <EuiText size="s">
                  <ul>
                    <li>
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.hostIsolation.placeholderCase"
                        defaultMessage="Case"
                      />
                    </li>
                  </ul>
                </EuiText>
              </>
            )}
          </EuiCallOut>
          <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty flush="right" onClick={backToAlertDetails}>
                <EuiText size="s">
                  <p>{RETURN_TO_ALERT_DETAILS}</p>
                </EuiText>
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      );
    }, [backToAlertDetails, hostName]);

    const hostNotIsolated = useMemo(() => {
      return (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.hostIsolation.isolateThisHost"
                defaultMessage="Isolate host {hostname} from network. This action will be added to the {cases}."
                values={{
                  hostname: <b>{hostName}</b>,
                  cases: (
                    <b>
                      {caseCount}
                      {CASES_ASSOCIATED_WITH_ALERT}
                      {alertRule}
                    </b>
                  ),
                }}
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h4>{COMMENT}</h4>
          </EuiTitle>
          <EuiTextArea
            data-test-subj="host_isolation_comment"
            fullWidth={true}
            placeholder={COMMENT_PLACEHOLDER}
            value={comment}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
              setComment(event.target.value)
            }
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={backToAlertDetails}>{CANCEL}</EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={confirmHostIsolation} isLoading={loading}>
                {CONFIRM}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      );
    }, [alertRule, backToAlertDetails, comment, confirmHostIsolation, hostName, loading]);

    return isIsolated ? hostIsolated : hostNotIsolated;
  }
);

HostIsolationPanel.displayName = 'HostIsolationContent';
