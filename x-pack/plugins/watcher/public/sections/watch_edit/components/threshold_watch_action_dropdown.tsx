/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiFlexItem,
  EuiIcon,
  EuiFlexGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext, useEffect, useState } from 'react';
import { Action } from 'plugins/watcher/models/action';
import { ActionType } from '../../../../common/types/action_types';
import { fetchSettings } from '../../../lib/api';
import { WatchContext } from './watch_context';

const EMPTY_FIRST_OPTION_VALUE = 'empty-first-option';

const disabledMessage = i18n.translate(
  'xpack.watcher.sections.watchEdit.actions.disabledOptionLabel',
  {
    defaultMessage: 'Disabled. Configure elasticsearch.yml.',
  }
);

const firstActionOption = {
  inputDisplay: i18n.translate('xpack.watcher.sections.watchEdit.actions.emptyFirstOptionLabel', {
    defaultMessage: 'Add an action',
  }),
  value: EMPTY_FIRST_OPTION_VALUE,
};

export const WatchActionsDropdown: React.FunctionComponent = () => {
  const allActionTypes = Action.getActionTypes();
  const { addAction } = useContext(WatchContext);
  const [actions, setActions] = useState<any>(null);
  const getSettings = async () => {
    const settings = await fetchSettings();
    const newActions = Object.keys(allActionTypes).map(actionKey => {
      const { typeName, iconClass, selectMessage } = allActionTypes[actionKey];
      return {
        type: actionKey,
        typeName,
        iconClass,
        selectMessage,
        isEnabled: settings.actionTypes[actionKey].enabled,
      };
    });
    setActions(newActions);
  };
  useEffect(() => {
    getSettings();
  }, []);
  const actionOptions =
    actions &&
    actions.map((action: ActionType) => {
      const description = action.isEnabled ? action.selectMessage : disabledMessage;
      return {
        value: action.type,
        inputDisplay: action.typeName,
        disabled: !action.isEnabled,
        dropdownDisplay: (
          <EuiFlexGroup>
            <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
              <EuiIcon type={action.iconClass} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <strong>{action.typeName}</strong>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                <p className="euiTextColor--subdued">{description}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    });
  const actionOptionsWithEmptyValue = actionOptions
    ? [firstActionOption, ...actionOptions]
    : [firstActionOption];
  return (
    <EuiSuperSelect
      options={actionOptionsWithEmptyValue}
      valueOfSelected={EMPTY_FIRST_OPTION_VALUE}
      onChange={(value: string) => {
        const defaults = allActionTypes[value].defaults;
        addAction({ defaults, type: value });
      }}
      itemLayoutAlign="top"
      hasDividers
      isLoading={!actions}
    />
  );
};
