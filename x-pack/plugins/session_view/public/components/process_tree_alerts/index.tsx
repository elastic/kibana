/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiText, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useStyles } from './styles';
import { ProcessEvent } from '../../../common/types/process_tree';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../src/core/public';

interface ProcessTreeAlertsDeps {
  alerts: ProcessEvent[];
}

const getRuleUrl = (alert: ProcessEvent, http: CoreStart['http']) => {
  return http.basePath.prepend(`/app/security/rules/id/${alert.kibana?.alert.rule.uuid}`);
};

const ProcessTreeAlert = ({ alert }: { alert: ProcessEvent }) => {
  const { http } = useKibana<CoreStart>().services;

  if (!alert.kibana) {
    return null;
  }

  const { uuid, rule, original_event: event, workflow_status: status } = alert.kibana.alert;
  const { name, query, severity } = rule;

  return (
    <EuiText key={uuid} size="s" data-test-subj={`sessionView:sessionViewAlertDetail-${uuid}`}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <h6>
            <FormattedMessage id="xpack.sessionView.rule" defaultMessage="Rule" />
          </h6>
          {name}
          <h6>
            <FormattedMessage id="xpack.sessionView.query" defaultMessage="Query" />
          </h6>
          {query}
        </EuiFlexItem>
        <EuiFlexItem>
          <h6>
            <FormattedMessage id="xpack.sessionView.severity" defaultMessage="Severity" />
          </h6>
          {severity}
          <h6>
            <FormattedMessage
              id="xpack.sessionView.workflowStatus"
              defaultMessage="Workflow status"
            />
          </h6>
          {status}
        </EuiFlexItem>
        <EuiFlexItem>
          <h6>
            <FormattedMessage id="xpack.sessionView.action" defaultMessage="Action" />
          </h6>
          {event.action}
          <EuiSpacer />
          <div>
            <EuiButton
              size="s"
              href={getRuleUrl(alert, http)}
              data-test-subj={`sessionView:sessionViewAlertDetailViewRule-${uuid}`}
            >
              <FormattedMessage id="xpack.sessionView.viewRule" defaultMessage="View rule" />
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};

export function ProcessTreeAlerts({ alerts }: ProcessTreeAlertsDeps) {
  const styles = useStyles();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div css={styles.container} data-test-subj="sessionView:sessionViewAlertDetails">
      {alerts.map((alert: ProcessEvent) => (
        <ProcessTreeAlert alert={alert} />
      ))}
    </div>
  );
}
