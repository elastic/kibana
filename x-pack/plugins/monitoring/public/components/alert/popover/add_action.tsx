/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiButton,
  EuiSuperSelect,
  EuiFormRow,
} from '@elastic/eui';

import { CommonBaseAlert } from '../../../../common/types';
import { AlertPopoverContext } from '../lib/context';
import { ALERT_ACTION_TYPE_EMAIL } from '../../../../common/constants';
import { AlertPopoverSelectExistingAction } from './select_existing_action';

interface AlertPopoverAddActionProps {
  cancel: () => void;
  done: (alert: CommonBaseAlert) => void;
}
export const AlertPopoverAddAction: React.FC<AlertPopoverAddActionProps> = (
  props: AlertPopoverAddActionProps
) => {
  const { cancel, done } = props;
  const [actionTypeId, setActionTypeId] = React.useState('');
  const context = React.useContext(AlertPopoverContext);

  const selectActionTypeOptions = context?.validConnectorTypes.map(type => {
    let iconType = null;
    switch (type.id) {
      case ALERT_ACTION_TYPE_EMAIL:
        iconType = 'email';
        break;
    }
    const dropdownDisplay = (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          {iconType ? <EuiIcon type={iconType} size="s" /> : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{type.name}</EuiFlexItem>
      </EuiFlexGroup>
    );
    return {
      value: type.id,
      dropdownDisplay,
      inputDisplay: type.name,
      disabled: !type.enabled,
    };
  });

  return (
    <Fragment>
      <EuiFormRow label="Action type">
        <EuiSuperSelect
          options={selectActionTypeOptions}
          valueOfSelected={actionTypeId}
          onChange={value => setActionTypeId(value)}
        />
      </EuiFormRow>
      {actionTypeId ? (
        <Fragment>
          <AlertPopoverSelectExistingAction
            actionTypeId={actionTypeId}
            done={alert => {
              setActionTypeId('');
              done(alert);
            }}
          />
        </Fragment>
      ) : null}
      <EuiButton size="s" onClick={cancel}>
        Cancel
      </EuiButton>
    </Fragment>
  );
};
