/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiIcon,
  EuiText,
  EuiLink,
  EuiListGroup,
  EuiListGroupItem,
  EuiToolTip,
} from '@elastic/eui';

import { AlertPopoverContext } from '../lib/context';
import { ALERT_ACTION_TYPE_LOG, ALERT_ACTION_TYPE_EMAIL } from '../../../../common/constants';
import { Legacy } from '../../../legacy_shims';
import { AlertAction } from '../../../../../alerting/common';
import { AlertPopoverAddAction } from './add_action';
import { AlertPopoverConfigureAction } from './configure_action';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface AlertPopoverTriggeredActionsProps {}
export const AlertPopoverTriggeredActions: React.FC<AlertPopoverTriggeredActionsProps> = (
  props: AlertPopoverTriggeredActionsProps
) => {
  const context = React.useContext(AlertPopoverContext);
  const [actions, setActions] = React.useState(context.alert.rawAlert.actions);
  const [currentConfigureActionTypeId, setCurrentConfigureActionTypeId] = React.useState<
    string | null
  >(null);
  const [showAddAction, setShowAddAction] = React.useState(false);

  function editAction(action: AlertAction, field: string, value: string) {
    const idx = actions.findIndex(act => act.id === action.id);
    setActions([
      ...actions.slice(0, idx),
      {
        ...action,
        params: {
          ...action.params,
          [field]: value,
        },
      },
      ...actions.slice(idx + 1),
    ]);
  }

  async function disableAction(action: AlertAction) {
    const index = actions.findIndex(_action => _action.id === action.id);
    const updatedActions = [...actions.slice(0, index), ...actions.slice(index + 1)];
    try {
      await Legacy.shims.kfetch({
        method: 'DELETE',
        pathname: `/api/monitoring/v1/alert/${context.alert.type}/action/${action.id}`,
        body: JSON.stringify({
          action,
        }),
      });
      setActions(updatedActions);
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: 'Error disabling action',
        text: err.message,
      });
    }
  }

  const actionList = actions.map(action => {
    let icon = 'dot';
    let message;

    switch (action.actionTypeId) {
      case ALERT_ACTION_TYPE_LOG:
        icon = 'logsApp';
        message = <EuiText size="s">Wrote to Kibana server log</EuiText>;
        break;
      case ALERT_ACTION_TYPE_EMAIL:
        const to = action.params && action.params.to ? action.params.to : 'n/a';
        icon = 'email';
        message = (
          <EuiToolTip position="top" content={`Sent to ${to}`}>
            <EuiText size="s">Sent an email</EuiText>
          </EuiToolTip>
        );
        break;
    }

    const label = (
      <Fragment>
        <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiIcon type={icon} size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={5}>{message}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink onClick={() => setCurrentConfigureActionTypeId(action.actionTypeId)}>
              <EuiText size="s">Configure</EuiText>
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink onClick={() => disableAction(action)}>
              <EuiText size="s">Disable</EuiText>
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );

    return (
      <EuiListGroupItem key={action.id} label={label} style={{ width: '100%', display: 'block' }} />
    );
  });

  actionList.push(
    <EuiListGroupItem
      key="addAction"
      label={
        <Fragment>
          <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiIcon type="listAdd" size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLink onClick={() => setShowAddAction(true)}>
                <EuiText size="s">
                  <p>Add action</p>
                </EuiText>
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
          {showAddAction ? (
            <Fragment>
              <EuiSpacer size="s" />
              <AlertPopoverAddAction
                cancel={() => setShowAddAction(false)}
                done={alert => {
                  setActions(alert.rawAlert.actions);
                  setShowAddAction(false);
                }}
              />
            </Fragment>
          ) : null}
        </Fragment>
      }
      style={{ width: '100%', display: 'block' }}
    />
  );

  let configureUi = null;
  if (currentConfigureActionTypeId) {
    const action = actions.find(_action => _action.actionTypeId === currentConfigureActionTypeId);
    if (action) {
      configureUi = (
        <AlertPopoverConfigureAction
          action={action}
          editAction={(field: string, value: string) => editAction(action, field, value)}
          cancel={() => setCurrentConfigureActionTypeId(null)}
          done={alert => {
            setCurrentConfigureActionTypeId(null);
            setActions(alert.rawAlert.actions);
          }}
        />
      );
    }
  }

  return (
    <Fragment>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>Triggered actions</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {configureUi}
      <EuiListGroup gutterSize="none" size="xs">
        {actionList}
      </EuiListGroup>
    </Fragment>
  );
};
