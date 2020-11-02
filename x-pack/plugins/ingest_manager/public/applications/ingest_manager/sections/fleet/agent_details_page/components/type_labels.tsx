/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentEvent } from '../../../../types';

export const TYPE_LABEL: { [key in AgentEvent['type']]: JSX.Element } = {
  STATE: (
    <EuiBadge color="hollow">
      <FormattedMessage id="xpack.fleet.agentEventType.stateLabel" defaultMessage="State" />
    </EuiBadge>
  ),
  ERROR: (
    <EuiBadge color="danger">
      <FormattedMessage id="xpack.fleet.agentEventType.errorLabel" defaultMessage="Error" />
    </EuiBadge>
  ),
  ACTION_RESULT: (
    <EuiBadge color="secondary">
      <FormattedMessage
        id="xpack.fleet.agentEventType.actionResultLabel"
        defaultMessage="Action result"
      />
    </EuiBadge>
  ),
  ACTION: (
    <EuiBadge color="primary">
      <FormattedMessage id="xpack.fleet.agentEventType.actionLabel" defaultMessage="Action" />
    </EuiBadge>
  ),
};

export const SUBTYPE_LABEL: { [key in AgentEvent['subtype']]: JSX.Element } = {
  RUNNING: (
    <EuiBadge color="hollow">
      <FormattedMessage id="xpack.fleet.agentEventSubtype.runningLabel" defaultMessage="Running" />
    </EuiBadge>
  ),
  STARTING: (
    <EuiBadge color="hollow">
      <FormattedMessage
        id="xpack.fleet.agentEventSubtype.startingLabel"
        defaultMessage="Starting"
      />
    </EuiBadge>
  ),
  IN_PROGRESS: (
    <EuiBadge color="hollow">
      <FormattedMessage
        id="xpack.fleet.agentEventSubtype.inProgressLabel"
        defaultMessage="In progress"
      />
    </EuiBadge>
  ),
  CONFIG: (
    <EuiBadge color="hollow">
      <FormattedMessage id="xpack.fleet.agentEventSubtype.policyLabel" defaultMessage="Policy" />
    </EuiBadge>
  ),
  FAILED: (
    <EuiBadge color="hollow">
      <FormattedMessage id="xpack.fleet.agentEventSubtype.failedLabel" defaultMessage="Failed" />
    </EuiBadge>
  ),
  STOPPING: (
    <EuiBadge color="hollow">
      <FormattedMessage
        id="xpack.fleet.agentEventSubtype.stoppingLabel"
        defaultMessage="Stopping"
      />
    </EuiBadge>
  ),
  STOPPED: (
    <EuiBadge color="hollow">
      <FormattedMessage id="xpack.fleet.agentEventSubtype.stoppedLabel" defaultMessage="Stopped" />
    </EuiBadge>
  ),
  DEGRADED: (
    <EuiBadge color="hollow">
      <FormattedMessage
        id="xpack.fleet.agentEventSubtype.degradedLabel"
        defaultMessage="Degraded"
      />
    </EuiBadge>
  ),
  DATA_DUMP: (
    <EuiBadge color="hollow">
      <FormattedMessage
        id="xpack.fleet.agentEventSubtype.dataDumpLabel"
        defaultMessage="Data dump"
      />
    </EuiBadge>
  ),
  ACKNOWLEDGED: (
    <EuiBadge color="hollow">
      <FormattedMessage
        id="xpack.fleet.agentEventSubtype.acknowledgedLabel"
        defaultMessage="Acknowledged"
      />
    </EuiBadge>
  ),
  UPDATING: (
    <EuiBadge color="hollow">
      <FormattedMessage
        id="xpack.fleet.agentEventSubtype.updatingLabel"
        defaultMessage="Updating"
      />
    </EuiBadge>
  ),
  UNKNOWN: (
    <EuiBadge color="hollow">
      <FormattedMessage id="xpack.fleet.agentEventSubtype.unknownLabel" defaultMessage="Unknown" />
    </EuiBadge>
  ),
};
