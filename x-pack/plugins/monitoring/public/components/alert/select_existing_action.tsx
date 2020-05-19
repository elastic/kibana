/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiText, EuiLink, EuiSuperSelect, EuiFormRow } from '@elastic/eui';

import { CommonBaseAlert } from '../../../common/types';
import { AlertPopoverContext } from './lib';
import { Legacy } from '../../legacy_shims';
import { ActionResult } from '../../../../actions/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ConnectorAddModal } from '../../../../triggers_actions_ui/public/application/sections/action_connector_form/connector_add_modal';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionConnector } from '../../../../triggers_actions_ui/public/types';
import { AlertPopoverConfigureNewAction } from './configure_new_action';

interface AlertPopoverSelectExistingActionProps {
  actionTypeId: string;
  done: (alert: CommonBaseAlert) => void;
}
export const AlertPopoverSelectExistingAction: React.FC<AlertPopoverSelectExistingActionProps> = (
  props: AlertPopoverSelectExistingActionProps
) => {
  const { actionTypeId, done } = props;
  const [showModal, setShowModal] = React.useState(false);
  const [existingActionId, setExistingActionId] = React.useState('');
  const context = React.useContext(AlertPopoverContext);

  let modal = null;
  const actionType = context.validConnectorTypes.find(type => type.id === actionTypeId);
  if (showModal && actionType) {
    modal = (
      <ConnectorAddModal
        actionType={actionType}
        addModalVisible={true}
        setAddModalVisibility={() => setShowModal(false)}
        postSaveEventHandler={(savedAction: ActionConnector) => {
          context.addAction(savedAction as ActionResult);
        }}
        actionTypeRegistry={Legacy.shims.triggersActionsUi.actionTypeRegistry}
        http={Legacy.shims.http}
        toastNotifications={Legacy.shims.toastNotifications}
        docLinks={Legacy.shims.docLinks}
        capabilities={Legacy.shims.capabilities}
      />
    );
  }

  const configuredActionsOptions = context.configuredActions.reduce((list: any[], action) => {
    if (action.actionTypeId !== actionTypeId) {
      return list;
    }

    list.push({
      value: action.id,
      dropdownDisplay: action.name,
      inputDisplay: action.name,
      disabled: !!context.alert.rawAlert.actions.find(
        _action => _action.actionTypeId === actionTypeId
      ),
    });
    return list;
  }, []);

  return (
    <Fragment>
      {modal}
      <EuiFormRow
        label="Select existing connector"
        helpText={
          <EuiText size="s">
            or <EuiLink onClick={() => setShowModal(true)}>create a new one</EuiLink>
          </EuiText>
        }
      >
        <EuiSuperSelect
          options={configuredActionsOptions}
          valueOfSelected={existingActionId}
          onChange={value => setExistingActionId(value)}
        />
      </EuiFormRow>
      {existingActionId ? (
        <AlertPopoverConfigureNewAction
          actionId={existingActionId}
          actionTypeId={actionTypeId}
          cancel={() => {
            setExistingActionId('');
          }}
          done={done}
        />
      ) : null}
    </Fragment>
  );
};
