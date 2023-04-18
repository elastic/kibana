/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import * as i18n from '../translations';
import { MaintenanceWindowStatus } from '../../../../common';

interface TableActionsPopoverProps {
  status: MaintenanceWindowStatus;
  onEdit: () => void;
  onCancel: () => void;
  onArchive: (archive: boolean) => void;
  onCancelAndArchive: () => void;
}
type ModalType = 'cancel' | 'cancelAndArchive' | 'archive' | 'unarchive';

export const TableActionsPopover: React.FC<TableActionsPopoverProps> = React.memo(
  ({ status, onEdit, onCancel, onArchive, onCancelAndArchive }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalType, setModalType] = useState<ModalType>();

    const onButtonClick = useCallback(() => {
      setIsPopoverOpen((open) => !open);
    }, []);
    const closePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const closeModal = useCallback(() => setIsModalVisible(false), []);
    const showModal = useCallback((type: ModalType) => {
      setModalType(type);
      setIsModalVisible(true);
    }, []);

    const modal = useMemo(() => {
      const modals = {
        cancel: {
          title: i18n.CANCEL_MODAL_TITLE,
          subtitle: i18n.CANCEL_MODAL_SUBTITLE,
          cancelButton: i18n.CANCEL_MODAL_BUTTON,
          onConfirm: () => onCancel(),
        },
        cancelAndArchive: {
          title: i18n.CANCEL_AND_ARCHIVE_MODAL_TITLE,
          subtitle: i18n.CANCEL_AND_ARCHIVE_MODAL_SUBTITLE,
          cancelButton: i18n.CANCEL_MODAL_BUTTON,
          onConfirm: () => onCancelAndArchive(),
        },
        archive: {
          title: i18n.ARCHIVE_TITLE,
          subtitle: i18n.ARCHIVE_SUBTITLE,
          cancelButton: i18n.CANCEL,
          onConfirm: () => onArchive(true),
        },
        unarchive: {
          title: i18n.UNARCHIVE_MODAL_TITLE,
          subtitle: i18n.UNARCHIVE_MODAL_SUBTITLE,
          cancelButton: i18n.CANCEL,
          onConfirm: () => onArchive(false),
        },
      };
      let m;
      if (isModalVisible && modalType) {
        const modalProps = modals[modalType];
        m = (
          <EuiConfirmModal
            style={{ width: 600 }}
            title={modalProps.title}
            onCancel={closeModal}
            onConfirm={() => {
              closeModal();
              modalProps.onConfirm();
            }}
            cancelButtonText={modalProps.cancelButton}
            confirmButtonText={modalProps.title}
            defaultFocusedButton="confirm"
            buttonColor="danger"
          >
            <p>{modalProps.subtitle}</p>
          </EuiConfirmModal>
        );
      }
      return m;
    }, [modalType, isModalVisible, closeModal, onArchive, onCancel, onCancelAndArchive]);

    const items = useMemo(() => {
      const menuItems = [];
      if (status !== MaintenanceWindowStatus.Archived) {
        menuItems.push(
          <EuiContextMenuItem
            key="edit"
            icon="pencil"
            onClick={() => {
              closePopover();
              onEdit();
            }}
          >
            {i18n.TABLE_ACTION_EDIT}
          </EuiContextMenuItem>
        );
      }
      if (status === MaintenanceWindowStatus.Running) {
        menuItems.push(
          <EuiContextMenuItem
            key="cancel"
            icon="stopSlash"
            onClick={() => {
              closePopover();
              showModal('cancel');
            }}
          >
            {i18n.TABLE_ACTION_CANCEL}
          </EuiContextMenuItem>
        );
        menuItems.push(
          <EuiContextMenuItem
            key="cancel-and-archive"
            icon="trash"
            onClick={() => {
              closePopover();
              showModal('cancelAndArchive');
            }}
          >
            {i18n.TABLE_ACTION_CANCEL_AND_ARCHIVE}
          </EuiContextMenuItem>
        );
      }
      if (
        status !== MaintenanceWindowStatus.Running &&
        status !== MaintenanceWindowStatus.Archived
      ) {
        menuItems.push(
          <EuiContextMenuItem
            key="archive"
            icon="trash"
            onClick={() => {
              closePopover();
              showModal('archive');
            }}
          >
            {i18n.ARCHIVE}
          </EuiContextMenuItem>
        );
      }
      if (status === MaintenanceWindowStatus.Archived) {
        menuItems.push(
          <EuiContextMenuItem
            key="unarchive"
            icon="exit"
            onClick={() => {
              closePopover();
              showModal('unarchive');
            }}
          >
            {i18n.TABLE_ACTION_UNARCHIVE}
          </EuiContextMenuItem>
        );
      }
      return menuItems;
    }, [status, onEdit, closePopover, showModal]);

    return (
      <>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonIcon
                  data-test-subj="upcoming-events-icon-button"
                  iconType="boxesHorizontal"
                  size="s"
                  aria-label="Upcoming events"
                  onClick={onButtonClick}
                />
              }
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downCenter"
            >
              <EuiContextMenuPanel items={items} />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
        {modal}
      </>
    );
  }
);
TableActionsPopover.displayName = 'TableActionsPopover';
