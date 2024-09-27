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

export interface TableActionsPopoverProps {
  id: string;
  status: MaintenanceWindowStatus;
  isLoading: boolean;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
  onArchive: (id: string, archive: boolean) => void;
  onCancelAndArchive: (id: string) => void;
}
type ModalType = 'cancel' | 'cancelAndArchive' | 'archive' | 'unarchive';
type ActionType = ModalType | 'edit';

export const TableActionsPopover: React.FC<TableActionsPopoverProps> = React.memo(
  ({ id, status, isLoading, onEdit, onCancel, onArchive, onCancelAndArchive }) => {
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
          props: {
            title: i18n.CANCEL_MODAL_TITLE,
            onConfirm: () => {
              closeModal();
              onCancel(id);
            },
            cancelButtonText: i18n.CANCEL_MODAL_BUTTON,
            confirmButtonText: i18n.CANCEL_MODAL_TITLE,
          },
          subtitle: i18n.CANCEL_MODAL_SUBTITLE,
        },
        cancelAndArchive: {
          props: {
            title: i18n.CANCEL_AND_ARCHIVE_MODAL_TITLE,
            onConfirm: () => {
              closeModal();
              onCancelAndArchive(id);
            },
            cancelButtonText: i18n.CANCEL_MODAL_BUTTON,
            confirmButtonText: i18n.CANCEL_AND_ARCHIVE_MODAL_TITLE,
          },
          subtitle: i18n.CANCEL_AND_ARCHIVE_MODAL_SUBTITLE,
        },
        archive: {
          props: {
            title: i18n.ARCHIVE_TITLE,
            onConfirm: () => {
              closeModal();
              onArchive(id, true);
            },
            cancelButtonText: i18n.CANCEL,
            confirmButtonText: i18n.ARCHIVE_TITLE,
          },
          subtitle: i18n.ARCHIVE_SUBTITLE,
        },
        unarchive: {
          props: {
            title: i18n.UNARCHIVE_MODAL_TITLE,
            onConfirm: () => {
              closeModal();
              onArchive(id, false);
            },
            cancelButtonText: i18n.CANCEL,
            confirmButtonText: i18n.UNARCHIVE_MODAL_TITLE,
          },
          subtitle: i18n.UNARCHIVE_MODAL_SUBTITLE,
        },
      };
      let m;
      if (isModalVisible && modalType) {
        const modalProps = modals[modalType];
        m = (
          <EuiConfirmModal
            {...modalProps.props}
            style={{ width: 600 }}
            onCancel={closeModal}
            defaultFocusedButton="confirm"
            buttonColor="danger"
          >
            <p>{modalProps.subtitle}</p>
          </EuiConfirmModal>
        );
      }
      return m;
    }, [id, modalType, isModalVisible, closeModal, onArchive, onCancel, onCancelAndArchive]);

    const items = useMemo(() => {
      const menuItems = {
        edit: (
          <EuiContextMenuItem
            data-test-subj="table-actions-edit"
            key="edit"
            icon="pencil"
            onClick={() => {
              closePopover();
              onEdit(id);
            }}
          >
            {i18n.TABLE_ACTION_EDIT}
          </EuiContextMenuItem>
        ),
        cancel: (
          <EuiContextMenuItem
            data-test-subj="table-actions-cancel"
            key="cancel"
            icon="stopSlash"
            onClick={() => {
              closePopover();
              showModal('cancel');
            }}
          >
            {i18n.TABLE_ACTION_CANCEL}
          </EuiContextMenuItem>
        ),
        cancelAndArchive: (
          <EuiContextMenuItem
            data-test-subj="table-actions-cancel-and-archive"
            key="cancel-and-archive"
            icon="trash"
            onClick={() => {
              closePopover();
              showModal('cancelAndArchive');
            }}
          >
            {i18n.TABLE_ACTION_CANCEL_AND_ARCHIVE}
          </EuiContextMenuItem>
        ),
        archive: (
          <EuiContextMenuItem
            data-test-subj="table-actions-archive"
            key="archive"
            icon="trash"
            onClick={() => {
              closePopover();
              showModal('archive');
            }}
          >
            {i18n.ARCHIVE}
          </EuiContextMenuItem>
        ),
        unarchive: (
          <EuiContextMenuItem
            data-test-subj="table-actions-unarchive"
            key="unarchive"
            icon="exit"
            onClick={() => {
              closePopover();
              showModal('unarchive');
            }}
          >
            {i18n.TABLE_ACTION_UNARCHIVE}
          </EuiContextMenuItem>
        ),
      };
      const statusMenuItemsMap: Record<MaintenanceWindowStatus, ActionType[]> = {
        running: ['edit', 'cancel', 'cancelAndArchive'],
        upcoming: ['edit', 'archive'],
        finished: ['edit', 'archive'],
        archived: ['unarchive'],
      };
      return statusMenuItemsMap[status].map((type) => menuItems[type]);
    }, [id, status, onEdit, closePopover, showModal]);

    const button = useMemo(
      () => (
        <EuiButtonIcon
          isDisabled={isLoading}
          data-test-subj="table-actions-icon-button"
          iconType="boxesHorizontal"
          size="s"
          aria-label="Upcoming events"
          onClick={onButtonClick}
        />
      ),
      [isLoading, onButtonClick]
    );

    return (
      <>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={button}
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downCenter"
              data-test-subj="table-actions-popover"
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
