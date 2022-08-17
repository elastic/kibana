/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiIcon,
} from '@elastic/eui';

import type { CurrentAction } from '../../../../types';
import { useActionStatus } from '../hooks';

export const ActionStatusCallout: React.FunctionComponent = ({}) => {
  const { currentActions } = useActionStatus();

  const actionNames: { [key: string]: string } = {
    POLICY_REASSIGN: 'Reassign',
    UPGRADE: 'Upgrade',
    UNENROLL: 'Unenroll',
  };

  const calloutTitle = (currentAction: CurrentAction) => (
    <FormattedMessage
      id="xpack.fleet.currentAction.calloutTitle"
      defaultMessage="{type} {status}, {nbAgentsAck} of {nbAgents} done, actionId: {actionId}"
      values={{
        // TODO failed status
        status: currentAction.complete
          ? 'completed'
          : currentAction.timedOut
          ? 'timed out'
          : 'in progress',
        type: actionNames[currentAction.type ?? 'UPGRADE'],
        nbAgents: currentAction.nbAgents,
        nbAgentsAck: currentAction.nbAgentsAck,
        version: currentAction.version,
        actionId: currentAction.actionId,
      }}
    />
  );
  return (
    <>
      {currentActions.map((currentAction) => (
        <React.Fragment key={currentAction.actionId}>
          <EuiCallOut
            color={
              currentAction.complete ? 'success' : currentAction.timedOut ? 'danger' : 'primary'
            }
          >
            <EuiFlexGroup
              className="euiCallOutHeader__title"
              justifyContent="spaceBetween"
              alignItems="center"
              gutterSize="none"
            >
              <EuiFlexItem grow={false}>
                <div>
                  {!currentAction.complete && !currentAction.timedOut ? (
                    <EuiLoadingSpinner />
                  ) : currentAction.complete ? (
                    <EuiIcon type="check" />
                  ) : (
                    <EuiIcon type="cross" />
                  )}
                  &nbsp;&nbsp;
                  {calloutTitle(currentAction)}
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCallOut>
          <EuiSpacer size="l" />
        </React.Fragment>
      ))}
    </>
  );
};
