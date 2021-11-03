/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiButtonIcon, EuiConfirmModal } from '@elastic/eui';

import { CANCEL_BUTTON_LABEL, MANAGE_BUTTON_LABEL, DELETE_BUTTON_LABEL } from '../constants';

import {
  REMOVE_ROLE_MAPPING_TITLE,
  REMOVE_ROLE_MAPPING_BUTTON,
  REMOVE_USER_BUTTON,
  ROLE_MODAL_TEXT,
  USER_MODAL_TITLE,
  USER_MODAL_TEXT,
} from './constants';

interface Props {
  username?: string;
  onManageClick(): void;
  onDeleteClick(): void;
}

export const UsersAndRolesRowActions: React.FC<Props> = ({
  onManageClick,
  onDeleteClick,
  username,
}) => {
  const [deleteModalVisible, setVisible] = useState(false);
  const showDeleteModal = () => setVisible(true);
  const closeDeleteModal = () => setVisible(false);
  const title = username ? USER_MODAL_TITLE(username) : REMOVE_ROLE_MAPPING_TITLE;
  const text = username ? USER_MODAL_TEXT : ROLE_MODAL_TEXT;
  const confirmButton = username ? REMOVE_USER_BUTTON : REMOVE_ROLE_MAPPING_BUTTON;

  const deleteModal = (
    <EuiConfirmModal
      title={title}
      onCancel={closeDeleteModal}
      onConfirm={() => {
        onDeleteClick();
        closeDeleteModal();
      }}
      cancelButtonText={CANCEL_BUTTON_LABEL}
      confirmButtonText={confirmButton}
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      <p>{text}</p>
    </EuiConfirmModal>
  );

  return (
    <>
      {deleteModalVisible && deleteModal}
      <EuiButtonIcon
        onClick={onManageClick}
        iconType="pencil"
        aria-label={MANAGE_BUTTON_LABEL}
      />{' '}
      <EuiButtonIcon onClick={showDeleteModal} iconType="trash" aria-label={DELETE_BUTTON_LABEL} />
    </>
  );
};
