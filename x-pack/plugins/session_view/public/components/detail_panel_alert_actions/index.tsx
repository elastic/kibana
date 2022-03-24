/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPopover, EuiContextMenuPanel, EuiButtonIcon, EuiContextMenuItem } from '@elastic/eui';
import { Process, ProcessEvent } from '../../../common/types/process_tree';
import { ProcessImpl } from '../process_tree/hooks';

export const BUTTON_TEST_ID = 'sessionView:detailPanelAlertActionsBtn';
export const SHOW_DETAILS_TEST_ID = 'sessionView:detailPanelAlertActionShowDetails';
export const JUMP_TO_PROCESS_TEST_ID = 'sessionView:detailPanelAlertActionJumpToProcess';

interface DetailPanelAlertActionsDeps {
  event: ProcessEvent;
  onShowAlertDetails: (alertId: string) => void;
  onProcessSelected: (process: Process) => void;
}

/**
 * Detail panel alert context menu actions
 */
export const DetailPanelAlertActions = ({
  event,
  onShowAlertDetails,
  onProcessSelected,
}: DetailPanelAlertActionsDeps) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const onClosePopover = useCallback(() => {
    setPopover(false);
  }, []);

  const onToggleMenu = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const onJumpToAlert = useCallback(() => {
    const process = new ProcessImpl(event.process.entity_id);
    process.addAlert(event);

    onProcessSelected(process);
    setPopover(false);
  }, [event, onProcessSelected]);

  const onShowDetails = useCallback(() => {
    if (event.kibana) {
      onShowAlertDetails(event.kibana.alert.uuid);
      setPopover(false);
    }
  }, [event, onShowAlertDetails]);

  if (!event.kibana) {
    return null;
  }

  const { uuid } = event.kibana.alert;

  const menuItems = [
    <EuiContextMenuItem key="details" data-test-subj={SHOW_DETAILS_TEST_ID} onClick={onShowDetails}>
      <FormattedMessage
        id="xpack.sessionView.detailPanelAlertListItem.showDetailsAction"
        defaultMessage="View alert details"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="jumpTo"
      data-test-subj={JUMP_TO_PROCESS_TEST_ID}
      onClick={onJumpToAlert}
    >
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
          aria-label={i18n.translate('xpack.sessionView.detailPanelAlertListItem.moreButton', {
            defaultMessage: 'More',
          })}
          data-test-subj={BUTTON_TEST_ID}
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
