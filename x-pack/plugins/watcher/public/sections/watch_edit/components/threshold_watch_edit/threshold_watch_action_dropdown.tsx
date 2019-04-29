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
import React, { useContext } from 'react';
import { Action } from 'plugins/watcher/models/action';
import { ACTION_TYPES } from '../../../../../common/constants';
import { WatchContext } from '../../watch_context';

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

interface Props {
  settings: {
    actionTypes: {
      [key: string]: {
        enabled: boolean;
      };
    };
  } | null;
  isLoading: boolean;
}

export const WatchActionsDropdown: React.FunctionComponent<Props> = ({ settings, isLoading }) => {
  const { addAction } = useContext(WatchContext);

  const allActionTypes = Action.getActionTypes() as Record<string, any>;

  const actions = Object.entries(allActionTypes).map(
    ([type, { typeName, iconClass, selectMessage }]) => ({
      type,
      typeName,
      iconClass,
      selectMessage,
      isEnabled: settings ? settings.actionTypes[type].enabled : true,
    })
  );

  const actionOptions = actions
    ? actions.map((action: any) => {
        const isActionDisabled = action.type === ACTION_TYPES.EMAIL && !action.isEnabled; // Currently can only fully verify email action
        const description = isActionDisabled ? disabledMessage : action.selectMessage;
        return {
          value: action.type,
          inputDisplay: action.typeName,
          disabled: isActionDisabled && !action.isEnabled,
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
      })
    : [];
  const actionOptionsWithEmptyValue = [firstActionOption, ...actionOptions];
  return (
    <EuiSuperSelect
      options={actionOptionsWithEmptyValue}
      valueOfSelected={EMPTY_FIRST_OPTION_VALUE}
      onChange={(value: string) => {
        addAction({ type: value, defaults: { isNew: true } });
      }}
      itemLayoutAlign="top"
      hasDividers
      isLoading={isLoading}
    />
  );
};
