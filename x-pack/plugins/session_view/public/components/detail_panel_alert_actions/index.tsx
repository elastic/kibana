/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPopover, EuiContextMenuPanel, EuiButtonIcon, EuiContextMenuItem } from '@elastic/eui';
import { Process, ProcessEvent } from '../../../common/types/process_tree';
import { ProcessImpl } from '../process_tree/hooks';

interface DetailPanelAlertActionsDeps {
  event: ProcessEvent;
  onProcessSelected: (process: Process) => void;
}

/**
 * Detail panel alert context menu actions
 */
export const DetailPanelAlertActions = ({
  event,
  onProcessSelected,
}: DetailPanelAlertActionsDeps) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const onClosePopover = useCallback(() => {
    setPopover(false);
  }, []);

  const onToggleMenu = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const onJumpToAlert = () => {
    const process = new ProcessImpl(event.process.entity_id);
    process.addEvent(event);

    onProcessSelected(process);
    setPopover(false);
  };

  const onShowDetails = useCallback(() => {
    // TODO: call into alert flyout
    setPopover(false);
  }, []);

  if (!event.kibana) {
    return null;
  }

  const { uuid } = event.kibana.alert;

  const menuItems = [
    <EuiContextMenuItem key="details" onClick={onShowDetails}>
      <FormattedMessage
        id="xpack.sessionView.detailPanelAlertListItem.showDetailsAction"
        defaultMessage="View alert details"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="jumpTo" onClick={onJumpToAlert}>
      <FormattedMessage
        id="xpack.sessionView.detailPanelAlertListItem.jumpToAlert"
        defaultMessage="Jump to alerted process"
      />
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      id={uuid}
      button={
        <EuiButtonIcon
          display="empty"
          size="s"
          iconType="boxesHorizontal"
          aria-label="More"
          onClick={onToggleMenu}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={onClosePopover}
      panelPaddingSize="none"
      anchorPosition="leftCenter"
    >
      <EuiContextMenuPanel size="s" items={menuItems} />
    </EuiPopover>
  );
};
