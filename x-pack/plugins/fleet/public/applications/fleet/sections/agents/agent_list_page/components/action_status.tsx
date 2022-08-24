/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiIcon,
  EuiAccordion,
} from '@elastic/eui';

import type { CurrentAction } from '../../../../types';
import { useActionStatus } from '../hooks';

export const ActionStatusCallout: React.FunctionComponent<{ refreshActionStatus: boolean }> = ({
  refreshActionStatus,
}) => {
  const { currentActions, refreshActions } = useActionStatus();

  useEffect(() => {
    setTimeout(refreshActions, 10000);
  }, [refreshActionStatus, refreshActions]);

  const actionNames: { [key: string]: string } = {
    POLICY_REASSIGN: 'Reassign',
    UPGRADE: 'Upgrade',
    UNENROLL: 'Unenroll',
    CANCEL: 'Cancel',
    ACTION: 'Action',
  };

  const calloutTitle = (currentAction: CurrentAction) => (
    <FormattedMessage
      id="xpack.fleet.currentAction.calloutTitle"
      defaultMessage="{type} {status}, {total} actioned, {nbAgents} started, {nbAgentsAck} acknowledged, actionId: {actionId}"
      values={{
        status: currentAction.status,
        type: actionNames[currentAction.type ?? 'ACTION'],
        total: currentAction.total,
        nbAgents: currentAction.nbAgents,
        nbAgentsAck: currentAction.nbAgentsAck,
        actionId: currentAction.actionId,
      }}
    />
  );
  return (
    <>
      {currentActions
        .filter((action) => action.type !== 'UPGRADE')
        .slice(0, 3)
        .map((currentAction) => (
          <React.Fragment key={currentAction.actionId}>
            <EuiCallOut
              color={
                currentAction.status === 'complete'
                  ? 'success'
                  : currentAction.status === 'failed'
                  ? 'danger'
                  : 'primary'
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
                    {currentAction.status === 'complete' ? (
                      <EuiIcon type="check" />
                    ) : currentAction.status === 'failed' ? (
                      <EuiIcon type="alert" />
                    ) : (
                      <EuiLoadingSpinner />
                    )}
                    &nbsp;&nbsp;
                    {calloutTitle(currentAction)}
                  </div>
                  <div>
                    {currentAction.errorMessage && (
                      <EuiAccordion
                        id={currentAction.actionId}
                        buttonContent="Expand error message"
                      >
                        {currentAction.errorMessage}
                      </EuiAccordion>
                    )}
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
