/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
    const [isIsolated, setIsolated] = useState(false);

    const findAgentId = find({ category: 'agent', field: 'agent.id' }, details)?.values;
    const agentId = findAgentId ? findAgentId[0] : '';
    const findHostName = find({ category: 'host', field: 'host.name' }, details)?.values;
    const hostName = findHostName ? findHostName[0] : '';
    const findAlertRule = find({ category: 'signal', field: 'signal.rule.name' }, details)?.values;
    const alertRule = findAlertRule ? findAlertRule[0] : '';

    const { loading, isolateHost } = useHostIsolation({ agentId, comment });

    const confirmHostIsolation = async () => {
      const hostIsolated = await isolateHost();
      setIsolated(hostIsolated);
    };

    const caseCount: number = 1;

    return isIsolated ? (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          iconType="check"
          color="success"
          title={i18n.translate('xpack.securitySolution.hostIsolation.successfulIsolation.title', {
            defaultMessage: 'Host Isolation on {hostname} successfully submitted',
            values: { hostname: hostName },
          })}
        >
          {caseCount > 0 && (
            <>
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.hostIsolation.successfulIsolation.cases"
                    defaultMessage="This case has been attached to the following {caseCount, plural, one {case} other {cases}}:"
                    values={{ caseCount }}
                  />
                </p>
              </EuiText>
              <EuiText size="s">
                <ul>
                  <li>
                    <FormattedMessage
                      id="xpack.securitySolution.hostIsolation.placeholderCase"
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
            <EuiButtonEmpty flush="right" onClick={() => cancelCallback()}>
              <EuiText size="s">
                <p>{RETURN_TO_ALERT_DETAILS}</p>
              </EuiText>
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    ) : (
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
            <EuiButtonEmpty onClick={() => cancelCallback()}>{CANCEL}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={confirmHostIsolation} isLoading={loading}>
              {CONFIRM}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

HostIsolationPanel.displayName = 'HostIsolationContent';
