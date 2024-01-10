/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { EuiButtonIcon, EuiPopover, EuiContextMenu, EuiIcon, EuiTextColor } from '@elastic/eui';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import type { Owner } from '../../../common/constants/types';
import * as i18n from './translations';

import { constructFileKindIdByOwner } from '../../../common/files';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesToast } from '../../common/use_cases_toast';
import { DeleteAttachmentConfirmationModal } from '../user_actions/delete_attachment_confirmation_modal';
import { useDeleteFileAttachment } from '../../containers/use_delete_file_attachment';
import { useDeletePropertyAction } from '../user_actions/property_actions/use_delete_property_action';

export const FileActionsPopoverButton: React.FC<{ caseId: string; theFile: FileJSON }> = ({
  caseId,
  theFile,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { owner, permissions } = useCasesContext();
  const { client: filesClient } = useFilesContext();

  const { showSuccessToast } = useCasesToast();
  const { isLoading, mutate: deleteFileAttachment } = useDeleteFileAttachment();
  const { showDeletionModal, onModalOpen, onConfirm, onCancel } = useDeletePropertyAction({
    onDelete: () => deleteFileAttachment({ caseId, fileId: theFile.id }),
  });

  const tooglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const panels = useMemo((): EuiContextMenuPanelDescriptor[] => {
    const fileHashesAvailable = theFile.hash?.md5 || theFile.hash?.sha1 || theFile.hash?.sha256;
    const mainPanelItems: EuiContextMenuPanelItemDescriptor[] = [
      {
        name: i18n.DOWNLOAD_FILE,
        icon: 'download',
        href: filesClient.getDownloadHref({
          fileKind: constructFileKindIdByOwner(owner[0] as Owner),
          id: theFile.id,
        }),
        onClick: closePopover,
        'data-test-subj': 'cases-files-download-button',
      },
    ];

    const panelsToBuild = [
      {
        id: 0,
        title: i18n.ACTIONS,
        items: mainPanelItems,
      },
      {
        id: 1,
        title: i18n.COPY_FILE_HASH,
        items: [
          {
            name: 'MD5',
            icon: 'copyClipboard',
            disabled: !theFile.hash?.md5,
            onClick: () => {
              if (theFile.hash?.md5) {
                navigator.clipboard.writeText(theFile.hash.md5).then(() => {
                  closePopover();
                  showSuccessToast(i18n.COPY_FILE_HASH_SUCCESS('md5'));
                });
              }
            },
            'data-test-subj': 'cases-files-copy-md5-hash-button',
          },
          {
            name: 'SHA1',
            icon: 'copyClipboard',
            disabled: !theFile.hash?.sha1,
            onClick: () => {
              if (theFile.hash?.sha1) {
                navigator.clipboard.writeText(theFile.hash.sha1).then(() => {
                  closePopover();
                  showSuccessToast(i18n.COPY_FILE_HASH_SUCCESS('sha1'));
                });
              }
            },
            'data-test-subj': 'cases-files-copy-sha1-hash-button',
          },
          {
            name: 'SHA256',
            icon: 'copyClipboard',
            disabled: !theFile.hash?.sha256,
            onClick: () => {
              if (theFile.hash?.sha256) {
                navigator.clipboard.writeText(theFile.hash.sha256).then(() => {
                  closePopover();
                  showSuccessToast(i18n.COPY_FILE_HASH_SUCCESS('sha256'));
                });
              }
            },
            'data-test-subj': 'cases-files-copy-sha256-hash-button',
          },
        ],
      },
    ];

    if (fileHashesAvailable) {
      mainPanelItems.push({
        name: i18n.COPY_FILE_HASH,
        icon: 'copyClipboard',
        panel: 1,
        'data-test-subj': 'cases-files-copy-hash-button',
      });
    }

    if (permissions.delete) {
      mainPanelItems.push({
        name: <EuiTextColor color={'danger'}>{i18n.DELETE_FILE}</EuiTextColor>,
        icon: <EuiIcon type="trash" size="m" color={'danger'} />,
        onClick: () => {
          closePopover();
          onModalOpen();
        },
        disabled: isLoading,
        'data-test-subj': 'cases-files-delete-button',
      });
    }

    return panelsToBuild;
  }, [
    closePopover,
    filesClient,
    isLoading,
    onModalOpen,
    owner,
    permissions,
    showSuccessToast,
    theFile,
  ]);

  return (
    <>
      <EuiPopover
        id={`cases-files-popover-${theFile.id}`}
        key={`cases-files-popover-${theFile.id}`}
        data-test-subj={`cases-files-popover-${theFile.id}`}
        button={
          <EuiButtonIcon
            onClick={tooglePopover}
            iconType="boxesHorizontal"
            aria-label={i18n.ACTIONS}
            color="text"
            key={`cases-files-actions-popover-button-${theFile.id}`}
            data-test-subj={`cases-files-actions-popover-button-${theFile.id}`}
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
          data-test-subj={'cases-files-popover-context-menu'}
        />
      </EuiPopover>
      {showDeletionModal && (
        <DeleteAttachmentConfirmationModal
          title={i18n.DELETE_FILE_TITLE}
          confirmButtonText={i18n.DELETE}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      )}
    </>
  );
};

FileActionsPopoverButton.displayName = 'FileActionsPopoverButton';
