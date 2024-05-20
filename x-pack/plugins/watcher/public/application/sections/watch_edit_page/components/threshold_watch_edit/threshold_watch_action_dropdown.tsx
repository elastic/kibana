/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiSpacer,
  EuiText,
  EuiFlexItem,
  EuiIcon,
  EuiFlexGroup,
  EuiButton,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { Action } from '../../../../models/action';
import { ACTION_TYPES } from '../../../../../../common/constants';
import { WatchContext } from '../../watch_context';

const disabledMessage = i18n.translate(
  'xpack.watcher.sections.watchEdit.actions.disabledOptionLabel',
  {
    defaultMessage: 'Disabled. Configure your elasticsearch.yml.',
  }
);

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

  const [isPopoverOpen, setIsPopOverOpen] = useState<boolean>(false);

  const allActionTypes = Action.getActionTypes() as Record<string, any>;

  const actions = Object.entries(allActionTypes).map(
    ([type, { typeName, iconClass, selectMessage }]) => {
      const isEnabled =
        settings &&
        settings.actionTypes &&
        settings.actionTypes[type] &&
        typeof settings.actionTypes[type].enabled !== 'undefined'
          ? settings.actionTypes[type].enabled
          : true;
      return {
        type,
        typeName,
        iconClass,
        selectMessage,
        isEnabled,
      };
    }
  );

  const button = (
    <EuiButton
      data-test-subj="addWatchActionButton"
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setIsPopOverOpen(!isPopoverOpen)}
    >
      <FormattedMessage
        id="xpack.watcher.sections.watchEdit.actions.addActionButtonLabel"
        defaultMessage="Add action"
      />
    </EuiButton>
  );

  return (
    <EuiPopover
      id="watchActionPanel"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopOverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        items={actions.map((action, index) => {
          const isActionDisabled = action.type === ACTION_TYPES.EMAIL && !action.isEnabled; // Currently can only fully verify email action
          const description = isActionDisabled ? disabledMessage : action.selectMessage;
          return (
            <EuiContextMenuItem
              key={`${action.type}-${index}`}
              disabled={isActionDisabled}
              data-test-subj={`${action.type}ActionButton`}
              onClick={() => {
                addAction({ type: action.type, defaults: { isNew: true } });
                setIsPopOverOpen(false);
              }}
            >
              <EuiFlexGroup responsive={false}>
                <EuiFlexItem grow={false} className="watcherThresholdWatchActionContextMenuItem">
                  <EuiIcon type={action.iconClass} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <strong>{action.typeName}</strong>
                  <EuiSpacer size="xs" />
                  <EuiText size="s">
                    <p>{description}</p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiContextMenuItem>
          );
        })}
      />
    </EuiPopover>
  );
};
