/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useMemo, useState } from 'react';

import { TRANSFORM_STATE } from '../../../../../../common';

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
      userCanDeleteIndex && indexPatternExists && deleteIndexPattern;
    // if we are deleting multiple transforms, then force delete all if at least one item has failed
    // else, force delete only when the item user picks has failed
    const forceDelete = isBulkAction
      ? shouldForceDelete
      : items[0] && items[0] && items[0].stats.state === TRANSFORM_STATE.FAILED;
    deleteTransforms(items, shouldDeleteDestIndex, shouldDeleteDestIndexPattern, forceDelete);
  };

  const openModal = (newItems: TransformListRow[]) => {
    // EUI issue: Might trigger twice, one time as an array,
    // one time as a single object. See https://github.com/elastic/eui/issues/3679
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
  };
};
