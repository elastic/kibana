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
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { UISession } from '../../types';
import { getAction } from './get_action';
import { ACTION, OnActionComplete } from './types';

// interfaces
interface PopoverActionProps {
  textColor?: EuiTextProps['color'];
  iconType: string;
  children: string | ReactElement;
}

interface PopoverActionItemsProps {
  session: UISession;
  api: SearchSessionsMgmtAPI;
  onActionComplete: OnActionComplete;
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

export const PopoverActionsMenu = ({ api, onActionComplete, session }: PopoverActionItemsProps) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const onPopoverClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const renderPopoverButton = () => (
    <EuiToolTip
      content={i18n.translate('xpack.data.mgmt.searchSessions.actions.tooltip.moreActions', {
        defaultMessage: 'More actions',
      })}
    >
      <EuiButtonIcon
        aria-label={i18n.translate('xpack.data.mgmt.searchSessions.ariaLabel.moreActions', {
          defaultMessage: 'More actions',
        })}
        color="text"
        iconType="boxesHorizontal"
        onClick={onPopoverClick}
      />
    </EuiToolTip>
  );

  const actions = session.actions || [];
  // Generic set of actions - up to the API to return what is available
  const items = actions.reduce((itemSet, actionType) => {
    const actionDef = getAction(api, actionType, session, onActionComplete);
    if (actionDef) {
      const { label, textColor, iconType } = actionDef;

      // add a line above the delete action (when there are multiple)
      // NOTE: Delete action MUST be the final action[] item
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
              data-test-subj={`sessionManagementPopoverAction-${actionType}`}
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

  return actions.length ? (
    <EuiPopover
      id={`popover-${session.id}`}
      button={renderPopoverButton()}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelPaddingSize={'s'}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  ) : null;
};
