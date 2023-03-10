/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useFilterGroupInternalContext } from './hooks/use_filters';
import {
  CONTEXT_MENU_RESET,
  CONTEXT_MENU_RESET_TOOLTIP,
  EDIT_CONTROLS,
  FILTER_GROUP_MENU,
  SAVE_CONTROLS,
} from './translations';

export const FilterGroupContextMenu = () => {
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);

  const {
    isViewMode,
    controlGroupInputUpdates,
    controlGroup,
    switchToViewMode,
    switchToEditMode,
    initialControls,
    dataViewId,
    setShowFiltersChangedBanner,
  } = useFilterGroupInternalContext();

  const toggleContextMenu = useCallback(() => {
    setIsContextMenuVisible((prev) => !prev);
  }, []);

  const withContextMenuAction = useCallback(
    (fn: unknown) => {
      return () => {
        if (typeof fn === 'function') {
          fn();
        }
        toggleContextMenu();
      };
    },
    [toggleContextMenu]
  );

  const resetSelection = useCallback(() => {
    if (!controlGroupInputUpdates) return;

    // remove existing embeddables
    controlGroup?.updateInput({
      panels: {},
    });

    initialControls.forEach((control, idx) => {
      controlGroup?.addOptionsListControl({
        controlId: String(idx),
        hideExclude: true,
        hideSort: true,
        hidePanelTitles: true,
        placeholder: '',
        // option List controls will handle an invalid dataview
        // & display an appropriate message
        dataViewId: dataViewId ?? '',
        ...control,
      });
    });

    controlGroup?.reload();
    switchToViewMode();
    setShowFiltersChangedBanner(false);
  }, [
    controlGroupInputUpdates,
    controlGroup,
    initialControls,
    dataViewId,
    switchToViewMode,
    setShowFiltersChangedBanner,
  ]);

  const resetButton = useMemo(
    () => (
      <EuiContextMenuItem
        icon="eraser"
        onClick={withContextMenuAction(resetSelection)}
        data-test-subj="filter-group__context--reset"
        toolTipContent={CONTEXT_MENU_RESET_TOOLTIP}
      >
        {CONTEXT_MENU_RESET}
      </EuiContextMenuItem>
    ),
    [withContextMenuAction, resetSelection]
  );

  const editControlsButton = useMemo(
    () => (
      <EuiContextMenuItem
        icon="pencil"
        onClick={
          isViewMode
            ? withContextMenuAction(switchToEditMode)
            : withContextMenuAction(switchToViewMode)
        }
        data-test-subj={isViewMode ? `filter_group__context--edit` : `filter_group__context--save`}
      >
        {isViewMode ? EDIT_CONTROLS : SAVE_CONTROLS}
      </EuiContextMenuItem>
    ),
    [withContextMenuAction, isViewMode, switchToEditMode, switchToViewMode]
  );

  const contextMenuItems = useMemo(
    () => [resetButton, editControlsButton],
    [resetButton, editControlsButton]
  );

  return (
    <EuiPopover
      id="filter-group__context-menu"
      button={
        <EuiButtonIcon
          aria-label={FILTER_GROUP_MENU}
          display="empty"
          size="s"
          iconType="boxesHorizontal"
          onClick={toggleContextMenu}
          data-test-subj="filter-group__context"
        />
      }
      isOpen={isContextMenuVisible}
      closePopover={toggleContextMenu}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel items={contextMenuItems} />
    </EuiPopover>
  );
};
