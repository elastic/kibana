/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiIcon,
} from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import { useEditTimelineOperation } from '../../timeline/header/edit_timeline_button';
import { useTimelineAddToFavoriteAction } from '../../timeline/properties/helpers';
import { useTimelineAddToCaseAction } from '../add_to_case_button';

interface Props {
  timelineId: string;
  showIcons: number;
}

export const TimelineContextMenu = ({ timelineId, showIcons }: Props) => {
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);

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

  const { openEditTimeline, editTimelineModal } = useEditTimelineOperation({
    timelineId,
  });

  const editTimelineNameDesc = useMemo(() => {
    return (
      <EuiContextMenuItem
        key="edit-timeline-btn"
        icon="pencil"
        onClick={withContextMenuAction(openEditTimeline)}
      >
        {'Edit Timeline'}
      </EuiContextMenuItem>
    );
  }, [openEditTimeline, withContextMenuAction]);

  const { toggleFavorite, isFavorite } = useTimelineAddToFavoriteAction({
    timelineId,
  });

  const toggleTimelineFavorite = useMemo(() => {
    return (
      <EuiContextMenuItem
        key="toggle-favorite-timeline-btn"
        icon={isFavorite ? 'starEmpty' : 'starFilled'}
        onClick={withContextMenuAction(toggleFavorite)}
      >
        {isFavorite ? 'Remove From Favorites' : 'Add to Favorites'}
      </EuiContextMenuItem>
    );
  }, [withContextMenuAction, toggleFavorite, isFavorite]);

  const { handleNewCaseClick, handleExistingCaseClick, casesModal } = useTimelineAddToCaseAction({
    timelineId,
  });

  const addToNewCase = useMemo(() => {
    return (
      <EuiContextMenuItem
        key="new-case"
        data-test-subj="attach-timeline-new-case"
        onClick={withContextMenuAction(handleNewCaseClick)}
      >
        {'Attach to a new Case'}
      </EuiContextMenuItem>
    );
  }, [handleNewCaseClick, withContextMenuAction]);

  const addToExistingCase = useMemo(() => {
    return (
      <EuiContextMenuItem
        key="new-case"
        data-test-subj="attach-timeline-existing-case"
        onClick={withContextMenuAction(handleExistingCaseClick)}
      >
        {'Attach to a existing Case'}
      </EuiContextMenuItem>
    );
  }, [handleExistingCaseClick, withContextMenuAction]);

  const contextMenuItems = useMemo(
    () => [editTimelineNameDesc, toggleTimelineFavorite, addToNewCase, addToExistingCase],
    [editTimelineNameDesc, toggleTimelineFavorite, addToNewCase, addToExistingCase]
  );

  return (
    <>
      {casesModal}
      {editTimelineModal}
      {isFavorite && <EuiIcon type={'starFilled'} size="m" />}
      <EuiPopover
        id={'timeline-context-menu'}
        button={
          <EuiButtonIcon
            aria-label={'timeline-context-menu-btn'}
            display="empty"
            size="s"
            iconType="boxesHorizontal"
            onClick={toggleContextMenu}
            data-test-subj={'timeline-context-menu-btn'}
          />
        }
        isOpen={isContextMenuVisible}
        closePopover={toggleContextMenu}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        panelProps={{
          'data-test-subj': 'timeline-context-menu',
        }}
      >
        <EuiContextMenuPanel items={contextMenuItems} />
      </EuiPopover>
    </>
  );
};
