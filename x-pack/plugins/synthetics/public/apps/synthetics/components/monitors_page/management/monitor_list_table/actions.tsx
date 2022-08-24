/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useState } from 'react';
import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { FETCH_STATUS, useFetcher } from '@kbn/observability-plugin/public';
import {
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiButtonEmpty,
  EuiConfirmModal,
} from '@elastic/eui';
import { kibanaService } from '../../../../../../utils/kibana_service';
import { fetchDeleteMonitor } from '../../../../state';
import { SyntheticsSettingsContext } from '../../../../contexts/synthetics_settings_context';

import * as labels from './labels';

interface Props {
  euiTheme: EuiThemeComputed;
  id: string;
  name: string;
  canEditSynthetics: boolean;
  reloadPage: () => void;
}

export const Actions = ({ euiTheme, id, name, reloadPage, canEditSynthetics }: Props) => {
  const { basePath } = useContext(SyntheticsSettingsContext);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const { status: monitorDeleteStatus } = useFetcher(() => {
    if (isDeleting) {
      return fetchDeleteMonitor({ id });
    }
  }, [id, isDeleting]);

  // TODO: Move deletion logic to redux state
  useEffect(() => {
    if (!isDeleting) {
      return;
    }
    if (
      monitorDeleteStatus === FETCH_STATUS.SUCCESS ||
      monitorDeleteStatus === FETCH_STATUS.FAILURE
    ) {
      setIsDeleting(false);
      setIsDeleteModalVisible(false);
    }
    if (monitorDeleteStatus === FETCH_STATUS.FAILURE) {
      kibanaService.toasts.addDanger(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteMonitorFailure">{labels.MONITOR_DELETE_FAILURE_LABEL}</p>
          ),
        },
        { toastLifeTimeMs: 3000 }
      );
    } else if (monitorDeleteStatus === FETCH_STATUS.SUCCESS) {
      reloadPage();
      kibanaService.toasts.addSuccess(
        {
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteMonitorSuccess">{labels.MONITOR_DELETE_SUCCESS_LABEL}</p>
          ),
        },
        { toastLifeTimeMs: 3000 }
      );
    }
  }, [setIsDeleting, isDeleting, reloadPage, monitorDeleteStatus]);

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

  const handleConfirmDelete = () => {
    setIsDeleting(true);
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
      href={`${basePath}/app/synthetics/edit-monitor/${id}`}
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
        id={`xpack.synthetics.${id}`}
        button={menuButton}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="s"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel size="s" items={menuItems} />
      </EuiPopover>

      {isDeleteModalVisible ? (
        <EuiConfirmModal
          title={`${labels.DELETE_MONITOR_LABEL} ${name}`}
          onCancel={() => setIsDeleteModalVisible(false)}
          onConfirm={handleConfirmDelete}
          cancelButtonText={labels.NO_LABEL}
          confirmButtonText={labels.YES_LABEL}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          isLoading={isDeleting}
        >
          <p>{labels.DELETE_DESCRIPTION_LABEL}</p>
        </EuiConfirmModal>
      ) : null}
    </>
  );
};
