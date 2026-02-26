/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu, EuiPopover, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

export interface ActionSubItem {
  id: string;
  name: string;
  onClick?: () => void;
  href?: string;
  icon?: string;
}

export interface Action {
  id: string;
  name: string;
  onClick?: () => void;
  href?: string;
  icon?: string;
  items?: ActionSubItem[];
}

export interface ActionGroup {
  id: string;
  groupLabel?: string;
  actions: Action[];
}

export type ActionGroups = ActionGroup[];

interface ActionsContextMenuProps {
  actions: ActionGroups;
  button: React.ReactElement;
  id?: string;
  dataTestSubjPrefix?: string;
}

export function ActionsContextMenu({
  actions,
  button,
  id = 'actions-context-menu',
  dataTestSubjPrefix = 'actionsContextMenu',
}: ActionsContextMenuProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const buttonWithToggle = useMemo(
    () => React.cloneElement(button, { onClick: togglePopover }),
    [button, togglePopover]
  );

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
    const mainPanelItems: EuiContextMenuPanelDescriptor['items'] = [];
    const subPanels: EuiContextMenuPanelDescriptor[] = [];
    let subPanelId = 1;

    for (const [groupIndex, group] of actions.entries()) {
      if (group.groupLabel) {
        mainPanelItems.push({
          name: group.groupLabel,
          disabled: true,
          css: {
            fontWeight: 700,
            color: euiTheme.colors.text,
            borderBottom: euiTheme.border.thin,
            marginTop: groupIndex > 0 ? euiTheme.size.m : 0,
          },
          'data-test-subj': `${dataTestSubjPrefix}Group-${group.id}`,
        });
      }

      for (const action of group.actions) {
        const hasSubItems = action.items && action.items.length > 0;

        if (hasSubItems) {
          const panelId = subPanelId++;

          mainPanelItems.push({
            name: action.name,
            icon: action.icon,
            panel: panelId,
            'data-test-subj': `${dataTestSubjPrefix}Item-${action.id}`,
          });

          subPanels.push({
            id: panelId,
            title: action.name,
            items: action.items!.map((subItem) => ({
              name: subItem.name,
              icon: subItem.icon,
              ...(subItem.href
                ? { href: subItem.href, target: '_self' }
                : {
                    onClick: () => {
                      subItem.onClick?.();
                      closePopover();
                    },
                  }),
              'data-test-subj': `${dataTestSubjPrefix}Item-${subItem.id}`,
            })),
          });
        } else {
          mainPanelItems.push({
            name: action.name,
            icon: action.icon,
            ...(action.href
              ? { href: action.href, target: '_self' }
              : {
                  onClick: action.onClick
                    ? () => {
                        action.onClick!();
                        closePopover();
                      }
                    : undefined,
                }),
            'data-test-subj': `${dataTestSubjPrefix}Item-${action.id}`,
          });
        }
      }
    }

    return [{ id: 0, items: mainPanelItems }, ...subPanels];
  }, [actions, closePopover, euiTheme, dataTestSubjPrefix]);

  return (
    <EuiPopover
      id={id}
      button={buttonWithToggle}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
}
