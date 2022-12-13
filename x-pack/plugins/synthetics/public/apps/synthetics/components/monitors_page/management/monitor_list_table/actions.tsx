/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState } from 'react';
import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';
import { EuiContextMenuPanel, EuiContextMenuItem, EuiPopover, EuiButtonEmpty } from '@elastic/eui';
import { DeleteMonitor } from './delete_monitor';
import { SyntheticsSettingsContext } from '../../../../contexts/synthetics_settings_context';

import * as labels from './labels';

interface Props {
  euiTheme: EuiThemeComputed;
  configId: string;
  name: string;
  canEditSynthetics: boolean;
  isProjectMonitor?: boolean;
  reloadPage: () => void;
}

export const Actions = ({
  euiTheme,
  configId,
  name,
  reloadPage,
  canEditSynthetics,
  isProjectMonitor,
}: Props) => {
  const { basePath } = useContext(SyntheticsSettingsContext);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  // TODO: Move deletion logic to redux state

  const openPopover = () => {
    setIsPopoverOpen(true);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const handleDeleteMonitor = () => {
    setIsDeleteModalVisible(true);
    closePopover();
  };

  const menuButton = (
    <EuiButtonEmpty
      iconType="boxesHorizontal"
      color="primary"
      iconSide="right"
      data-test-subj="syntheticsMonitorListActions"
      onClick={openPopover}
    />
  );

  /*
  TODO: Implement duplication functionality
  const duplicateMenuItem = (
    <EuiContextMenuItem key="xpack.synthetics.duplicateMonitor" icon="copy" onClick={closePopover}>
      {labels.DUPLICATE_LABEL}
    </EuiContextMenuItem>
  );
  */

  /*
  TODO: See if disable enabled is needed as an action menu item
  const disableEnableMenuItem = (
    isDisabled ? (
      <EuiContextMenuItem
        key="xpack.synthetics.enableMonitor"
        icon="play"
        onClick={handleEnableMonitor}
      >
        {labels.ENABLE_LABEL}
      </EuiContextMenuItem>
    ) : (
      <EuiContextMenuItem
        key="xpack.synthetics.disableMonitor"
        icon="pause"
        onClick={handleDisableMonitor}
      >
        {labels.DISABLE_LABEL}
      </EuiContextMenuItem>
    )
  );
  */

  const menuItems = [
    <EuiContextMenuItem
      key="xpack.synthetics.editMonitor"
      icon="pencil"
      onClick={closePopover}
      href={`${basePath}/app/synthetics/edit-monitor/${configId}`}
      disabled={!canEditSynthetics}
    >
      {labels.EDIT_LABEL}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      css={{ color: euiTheme.colors.danger }}
      key="xpack.synthetics.deleteMonitor"
      icon="trash"
      disabled={!canEditSynthetics}
      onClick={handleDeleteMonitor}
    >
      {labels.DELETE_LABEL}
    </EuiContextMenuItem>,
  ];

  return (
    <>
      <EuiPopover
        id={`xpack.synthetics.${configId}`}
        button={menuButton}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="s"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel size="s" items={menuItems} />
      </EuiPopover>

      {isDeleteModalVisible && (
        <DeleteMonitor
          configId={configId}
          name={name}
          reloadPage={reloadPage}
          isProjectMonitor={isProjectMonitor}
          setIsDeleteModalVisible={setIsDeleteModalVisible}
        />
      )}
    </>
  );
};
