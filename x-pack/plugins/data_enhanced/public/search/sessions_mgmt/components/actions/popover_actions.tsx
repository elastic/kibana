/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiTextProps,
  EuiToolTip,
} from '@elastic/eui';
import {
  EuiContextMenuPanelItemDescriptorEntry,
  EuiContextMenuPanelItemSeparator,
} from '@elastic/eui/src/components/context_menu/context_menu';
import { i18n } from '@kbn/i18n';
import React, { ReactElement, useState } from 'react';
import { TableText } from '../';
import { ACTION, ActionComplete, UISession } from '../../../../../common/search/sessions_mgmt';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { getAction } from './get_action';

// interfaces
interface PopoverActionProps {
  textColor?: EuiTextProps['color'];
  iconType: string;
  children: string | ReactElement;
}

interface PopoverActionItemsProps {
  session: UISession;
  api: SearchSessionsMgmtAPI;
  handleAction: ActionComplete;
}

// helper
const PopoverAction = ({ textColor, iconType, children, ...props }: PopoverActionProps) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" component="span" {...props}>
    <EuiFlexItem grow={false} component="span">
      <EuiIcon color={textColor} type={iconType} />
    </EuiFlexItem>
    <EuiFlexItem grow={true} component="span">
      <TableText color={textColor}>{children}</TableText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const PopoverActionsMenu = ({ api, handleAction, session }: PopoverActionItemsProps) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const onPopoverClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const renderPopoverButton = () => (
    <EuiButtonIcon
      aria-label={i18n.translate('xpack.data.mgmt.searchSessions.ariaLabel.moreActions', {
        defaultMessage: 'More actions',
      })}
      color="text"
      iconType="boxesHorizontal"
      onClick={onPopoverClick}
    />
  );

  const actions = session.actions || [];
  // Generic set of actions - up to the API to return what is available
  const items = actions.reduce((itemSet, actionType) => {
    const actionDef = getAction(api, actionType, session, handleAction);
    if (actionDef) {
      const { label, textColor, iconType } = actionDef;

      // add a line above the delete action (when there are multiple)
      if (actions.length > 1 && actionType === ACTION.DELETE) {
        itemSet.push({ isSeparator: true, key: 'separadorable' });
      }

      return [
        ...itemSet,
        {
          key: `action-${actionType}`,
          name: (
            <PopoverAction
              textColor={textColor}
              iconType={iconType}
              data-test-subj={`session-mgmt-popover-action-${actionType}`}
            >
              {label}
            </PopoverAction>
          ),
        },
      ];
    }
    return itemSet;
  }, [] as Array<EuiContextMenuPanelItemDescriptorEntry | EuiContextMenuPanelItemSeparator>);

  const panels: EuiContextMenuPanelDescriptor[] = [{ id: 0, items }];

  return (
    <EuiToolTip
      content={i18n.translate('xpack.data.mgmt.searchSessions.actions.tooltip.moreActions', {
        defaultMessage: 'More actions',
      })}
    >
      <EuiPopover
        id={`popover-${session.id}`}
        button={renderPopoverButton()}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="downLeft"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    </EuiToolTip>
  );
};
