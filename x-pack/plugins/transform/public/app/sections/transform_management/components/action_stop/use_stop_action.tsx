/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext, useMemo, useState } from 'react';
import { TRANSFORM_STATE } from '../../../../../../common/constants';
import { AuthorizationContext } from '../../../../lib/authorization';
import { TransformListAction, TransformListRow } from '../../../../common';
import { useStopTransforms } from '../../../../hooks';
import { isStopActionDisabled, stopActionNameText, StopActionName } from './stop_action_name';
import { isManagedTransform } from '../../../../common/managed_transforms_utils';

export type StopAction = ReturnType<typeof useStopAction>;

export const useStopAction = (forceDisable: boolean) => {
  const { canStartStopTransform } = useContext(AuthorizationContext).capabilities;

  const stopTransforms = useStopTransforms();
  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformListRow[]>([]);

  const closeModal = () => setModalVisible(false);

  const openModal = (newItems: TransformListRow[]) => {
    if (Array.isArray(newItems)) {
      setItems(newItems);
      setModalVisible(true);
    }
  };

  const stopAndCloseModal = useCallback(
    (transformSelection: TransformListRow[]) => {
      setModalVisible(false);
      stopTransforms(transformSelection.map((t) => ({ id: t.id, state: t.stats.state })));
    },
    [stopTransforms]
  );

  const clickHandler = useCallback(
    (i: TransformListRow) => stopTransforms([{ id: i.id, state: i.stats.state }]),
    [stopTransforms]
  );

  const action: TransformListAction = useMemo(
    () => ({
      name: (item: TransformListRow) => (
        <StopActionName items={[item]} forceDisable={forceDisable} />
      ),
      available: (item: TransformListRow) => item.stats.state !== TRANSFORM_STATE.STOPPED,
      enabled: (item: TransformListRow) =>
        !isStopActionDisabled([item], canStartStopTransform, forceDisable),
      description: stopActionNameText,
      icon: 'stop',
      type: 'icon',
      onClick: (item: TransformListRow) => {
        if (isManagedTransform(item)) {
          openModal([item]);
        } else {
          clickHandler(item);
        }
      },
      'data-test-subj': 'transformActionStop',
    }),
    [canStartStopTransform, clickHandler, forceDisable]
  );

  return { action, closeModal, openModal, isModalVisible, items, stopAndCloseModal };
};
