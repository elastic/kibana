/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo, useState } from 'react';

import { TRANSFORM_STATE } from '../../../../../../common/constants';

import { TransformListAction, TransformListRow } from '../../../../common';
import { useDeleteIndexAndTargetIndex, useDeleteTransforms } from '../../../../hooks';
import { AuthorizationContext } from '../../../../lib/authorization';

import {
  deleteActionNameText,
  isDeleteActionDisabled,
  DeleteActionName,
} from './delete_action_name';

export type DeleteAction = ReturnType<typeof useDeleteAction>;
export const useDeleteAction = (forceDisable: boolean) => {
  const { canDeleteTransform } = useContext(AuthorizationContext).capabilities;

  const deleteTransforms = useDeleteTransforms();

  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformListRow[]>([]);

  const isBulkAction = items.length > 1;
  const shouldForceDelete = useMemo(
    () => items.some((i: TransformListRow) => i.stats.state === TRANSFORM_STATE.FAILED),
    [items]
  );

  const closeModal = () => setModalVisible(false);

  const {
    userCanDeleteIndex,
    userCanDeleteDataView,
    deleteDestIndex,
    dataViewExists,
    deleteDataView,
    toggleDeleteIndex,
    toggleDeleteDataView,
  } = useDeleteIndexAndTargetIndex(items);

  const deleteAndCloseModal = () => {
    setModalVisible(false);

    const shouldDeleteDestIndex = userCanDeleteIndex && deleteDestIndex;
    const shouldDeleteDestDataView =
      userCanDeleteIndex && userCanDeleteDataView && dataViewExists && deleteDataView;
    // if we are deleting multiple transforms, then force delete all if at least one item has failed
    // else, force delete only when the item user picks has failed
    const forceDelete = isBulkAction
      ? shouldForceDelete
      : items[0] && items[0] && items[0].stats.state === TRANSFORM_STATE.FAILED;

    deleteTransforms({
      transformsInfo: items.map((i) => ({
        id: i.config.id,
        state: i.stats.state,
      })),
      deleteDestIndex: shouldDeleteDestIndex,
      deleteDestDataView: shouldDeleteDestDataView,
      forceDelete,
    });
  };

  const openModal = (newItems: TransformListRow[]) => {
    if (Array.isArray(newItems)) {
      setItems(newItems);
      setModalVisible(true);
    }
  };

  const action: TransformListAction = useMemo(
    () => ({
      name: (item: TransformListRow) => (
        <DeleteActionName
          {...{
            canDeleteTransform,
            disabled: isDeleteActionDisabled([item], forceDisable),
            isBulkAction: false,
          }}
        />
      ),
      enabled: (item: TransformListRow) =>
        !isDeleteActionDisabled([item], forceDisable) && canDeleteTransform,
      description: deleteActionNameText,
      icon: 'trash',
      type: 'icon',
      onClick: (item: TransformListRow) => openModal([item]),
      'data-test-subj': 'transformActionDelete',
    }),
    [canDeleteTransform, forceDisable]
  );

  return {
    action,
    closeModal,
    deleteAndCloseModal,
    deleteDestIndex,
    deleteDataView,
    dataViewExists,
    isModalVisible,
    items,
    openModal,
    shouldForceDelete,
    toggleDeleteIndex,
    toggleDeleteDataView,
    userCanDeleteIndex,
    userCanDeleteDataView,
  };
};
