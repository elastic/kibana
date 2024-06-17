/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';

import type { ActionStatus } from '../../../../../types';

export const inProgressTitleColor = '#0077CC';

const actionNames: {
  [key: string]: {
    inProgressText: React.ReactNode;
    completedText: React.ReactNode;
    cancelledText: React.ReactNode;
  };
} = {
  POLICY_REASSIGN: {
    inProgressText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.policyReassign.inProgress"
        defaultMessage="Reassigning"
      />
    ),
    completedText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.policyReassign.completed"
        defaultMessage="assigned to a new policy"
      />
    ),
    cancelledText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.policyReassign.cancelled"
        defaultMessage="assignment"
      />
    ),
  },
  UPGRADE: {
    inProgressText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.upgrade.inProgress"
        defaultMessage="Upgrading"
      />
    ),
    completedText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.upgrade.completed"
        defaultMessage="upgraded"
      />
    ),
    cancelledText: (
      <FormattedMessage id="xpack.fleet.agentActivity.upgrade.cancelled" defaultMessage="upgrade" />
    ),
  },
  UNENROLL: {
    inProgressText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.unenroll.inProgress"
        defaultMessage="Unenrolling"
      />
    ),
    completedText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.unenroll.completed"
        defaultMessage="unenrolled"
      />
    ),
    cancelledText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.unenroll.cancelled"
        defaultMessage="unenrollment"
      />
    ),
  },
  FORCE_UNENROLL: {
    inProgressText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.forceUnenroll.inProgress"
        defaultMessage="Force unenrolling"
      />
    ),
    completedText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.forceUnenroll.completed"
        defaultMessage="force unenrolled"
      />
    ),
    cancelledText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.forceUnenroll.cancelled"
        defaultMessage="force unenrollment"
      />
    ),
  },
  UPDATE_TAGS: {
    inProgressText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.updateTags.inProgress"
        defaultMessage="Updating tags of"
      />
    ),
    completedText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.updateTags.completed"
        defaultMessage="updated tags"
      />
    ),
    cancelledText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.updateTags.cancelled"
        defaultMessage="update tags"
      />
    ),
  },
  CANCEL: {
    inProgressText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.cancel.inProgress"
        defaultMessage="Cancelling"
      />
    ),
    completedText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.cancel.completed"
        defaultMessage="cancelled"
      />
    ),
    cancelledText: (
      <FormattedMessage id="xpack.fleet.agentActivity.cancel.cancelled" defaultMessage="" />
    ),
  },
  REQUEST_DIAGNOSTICS: {
    inProgressText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.requestDiagnostics.inProgress"
        defaultMessage="Requesting diagnostics for"
      />
    ),
    completedText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.requestDiagnostics.completed"
        defaultMessage="requested diagnostics"
      />
    ),
    cancelledText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.requestDiagnostics.cancelled"
        defaultMessage="request diagnostics"
      />
    ),
  },
  SETTINGS: {
    inProgressText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.settings.inProgress"
        defaultMessage="Updating settings of"
      />
    ),
    completedText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.settings.completed"
        defaultMessage="updated settings"
      />
    ),
    cancelledText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.settings.cancelled"
        defaultMessage="update settings"
      />
    ),
  },
  POLICY_CHANGE: {
    inProgressText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.policyChange.inProgress"
        defaultMessage="Applying policy change on"
      />
    ),
    completedText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.policyChange.completed"
        defaultMessage="applied policy change"
      />
    ),
    cancelledText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.policyChange.cancelled"
        defaultMessage="policy change"
      />
    ),
  },
  INPUT_ACTION: {
    inProgressText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.inputAction.inProgress"
        defaultMessage="Input action in progress of"
      />
    ),
    completedText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.inputAction.completed"
        defaultMessage="input action completed"
      />
    ),
    cancelledText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.inputAction.cancelled"
        defaultMessage="input action"
      />
    ),
  },
  ACTION: {
    inProgressText: (
      <FormattedMessage
        id="xpack.fleet.agentActivity.action.inProgress"
        defaultMessage="Actioning"
      />
    ),
    completedText: (
      <FormattedMessage id="xpack.fleet.agentActivity.action.completed" defaultMessage="actioned" />
    ),
    cancelledText: (
      <FormattedMessage id="xpack.fleet.agentActivity.action.cancelled" defaultMessage="action" />
    ),
  },
};

export const getAction = (type?: string) => actionNames[type ?? 'ACTION'] ?? actionNames.ACTION;

export const inProgressTitle = (action: ActionStatus) => (
  <FormattedMessage
    id="xpack.fleet.agentActivity.inProgressTitle"
    defaultMessage="{inProgressText} {nbAgents} {agents} {reassignText}{upgradeText}{failuresText}"
    values={{
      nbAgents:
        action.nbAgentsAck >= action.nbAgentsActioned
          ? action.nbAgentsAck
          : action.nbAgentsAck === 0
          ? action.nbAgentsActioned
          : action.nbAgentsActioned - action.nbAgentsAck + ' of ' + action.nbAgentsActioned,
      agents: action.nbAgentsActioned === 1 ? 'agent' : 'agents',
      inProgressText: getAction(action.type).inProgressText,
      reassignText:
        action.type === 'POLICY_REASSIGN' && action.newPolicyId ? (
          <FormattedMessage
            id="xpack.fleet.agentActivity.policyReassignText"
            defaultMessage="to {newPolicyId}"
            values={{ newPolicyId: action.newPolicyId }}
          />
        ) : (
          ''
        ),
      upgradeText:
        action.type === 'UPGRADE' ? (
          <FormattedMessage
            id="xpack.fleet.agentActivity.upgradeText"
            defaultMessage="to version {version}"
            values={{ version: action.version }}
          />
        ) : (
          ''
        ),
      failuresText:
        action.nbAgentsFailed > 0 ? (
          <FormattedMessage
            id="xpack.fleet.agentActivity.failuresText"
            defaultMessage=", has {nbAgentsFailed} failure(s)"
            values={{ nbAgentsFailed: action.nbAgentsFailed }}
          />
        ) : (
          ''
        ),
    }}
  />
);

export const inProgressDescription = (time?: string) => (
  <FormattedMessage
    id="xpack.fleet.agentActivityFlyout.startedDescription"
    defaultMessage="Started on {date}."
    values={{
      date: formattedTime(time),
    }}
  />
);

export const formattedTime = (time?: string) => {
  return time ? (
    <>
      <FormattedDate value={time} year="numeric" month="short" day="2-digit" />
      &nbsp;
      <FormattedTime value={time} />
    </>
  ) : null;
};
