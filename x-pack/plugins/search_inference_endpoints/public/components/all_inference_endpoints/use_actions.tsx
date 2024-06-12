/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { EuiButtonIcon, EuiContextMenu, EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useCopyIDAction } from './actions/use_copy_id_action';

const ActionColumnComponent: React.FC<{ id: 2; disableActions: boolean }> = ({
  id,
  disableActions,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const tooglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const copyIDAction = useCopyIDAction({
    onActionSuccess: closePopover,
  });

  const panels = useMemo((): EuiContextMenuPanelDescriptor[] => {
    const mainPanelItems: EuiContextMenuPanelItemDescriptor[] = [];
    const panelsToBuild: EuiContextMenuPanelDescriptor[] = [
      { id: 0, items: mainPanelItems, title: 'Actions' },
    ];

    mainPanelItems.push(copyIDAction.getAction(2));

    return panelsToBuild;
  }, [copyIDAction]);

  return (
    <>
      <EuiPopover
        id={`case-action-popover-${id}`}
        key={`case-action-popover-${id}`}
        data-test-subj={`case-action-popover-${id}`}
        button={
          <EuiButtonIcon
            onClick={tooglePopover}
            iconType="boxesHorizontal"
            aria-label={'Actions'}
            color="text"
            key={`case-action-popover-button-${id}`}
            data-test-subj={`case-action-popover-button-${id}`}
            disabled={false}
          />
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenu
          initialPanelId={0}
          panels={panels}
          key={`case-action-menu-${id}`}
          data-test-subj={`case-action-menu-${id}`}
        />
      </EuiPopover>
    </>
  );
};

ActionColumnComponent.displayName = 'ActionColumnComponent';

const ActionColumn = React.memo(ActionColumnComponent);

interface UseBulkActionsReturnValue {
  actions: any | null;
}

interface UseBulkActionsProps {
  disableActions: boolean;
}

export const useActions = ({ disableActions }: UseBulkActionsProps): UseBulkActionsReturnValue => {
  return {
    actions: {
      name: 'Actions',
      align: 'right',
      render: () => {
        return <ActionColumn id={2} key={2} disableActions={disableActions} />;
      },
      width: '100px',
    },
  };
};
