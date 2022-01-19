/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo, useState } from 'react';

import { TRANSFORM_STATE, TransformState } from '../../../../../../common/constants';
import type { TransformWithoutConfig } from '../../../../common/transform_list';
import type { TransformListAction, TransformListRow } from '../../../../common';
import { useDeleteIndexAndTargetIndex, useDeleteTransforms } from '../../../../hooks';
import { AuthorizationContext } from '../../../../lib/authorization';

import {
  deleteActionNameText,
  isDeleteActionDisabled,
  DeleteActionName,
} from './delete_action_name';
import { isPopulatedObject } from '../../../../../../common/shared_imports';

export type DeleteAction = ReturnType<typeof useDeleteAction>;

export const isTransformListRow = (arg: unknown): arg is TransformListRow => {
  return isPopulatedObject(arg, ['id', 'config', 'stats']);
};
export const useDeleteAction = (forceDisable: boolean, forceDelete = false) => {
  const { canDeleteTransform } = useContext(AuthorizationContext).capabilities;

  const deleteTransforms = useDeleteTransforms();

  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformWithoutConfig[]>([]);

  const isBulkAction = items.length > 1;
  const shouldForceDelete = useMemo(
    () =>
      forceDelete === true ??
      items.some((i: TransformWithoutConfig) => i.stats?.state === TRANSFORM_STATE.FAILED),
    [forceDelete, items]
  );

  const closeModal = () => setModalVisible(false);

  const {
    userCanDeleteIndex,
    userCanDeleteDataView,
    deleteDestIndex,
    indexPatternExists,
    deleteIndexPattern,
    toggleDeleteIndex,
    toggleDeleteIndexPattern,
  } = useDeleteIndexAndTargetIndex(items);

  const deleteAndCloseModal = () => {
    setModalVisible(false);

    const shouldDeleteDestIndex = userCanDeleteIndex && deleteDestIndex;
    const shouldDeleteDestIndexPattern =
      userCanDeleteIndex && userCanDeleteDataView && indexPatternExists && deleteIndexPattern;
    // if we are deleting multiple transforms, then force delete all if at least one item has failed
    // else, force delete only when the item user picks has failed
    const needForceDelete = isBulkAction
      ? shouldForceDelete
      : items[0] && items[0].stats?.state === TRANSFORM_STATE.FAILED;

    deleteTransforms(
      // If transform task doesn't have any corresponding config
      // we won't know what the destination index or data view would be
      // and should be force deleted
      forceDelete && items[0].config === undefined
        ? {
            transformsInfo: items.map((i) => ({
              id: i.id,
              state: TRANSFORM_STATE.FAILED,
            })),
            deleteDestIndex: false,
            deleteDestIndexPattern: false,
            forceDelete: true,
          }
        : {
            transformsInfo: items.map((i) => ({
              id: i.id ?? i.config?.id,
              state: i.stats?.state as TransformState,
            })),
            deleteDestIndex: shouldDeleteDestIndex,
            deleteDestIndexPattern: shouldDeleteDestIndexPattern,
            forceDelete: needForceDelete,
          }
    );
  };

  const openModal = (newItems: TransformWithoutConfig[]) => {
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
    deleteIndexPattern,
    indexPatternExists,
    isModalVisible,
    items,
    openModal,
    shouldForceDelete,
    toggleDeleteIndex,
    toggleDeleteIndexPattern,
    userCanDeleteIndex,
    userCanDeleteDataView,
  };
};
