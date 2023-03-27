/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo, useState } from 'react';

import { ReauthorizeActionName, reauthorizeActionNameText } from './reauthorize_action_name';
import { TRANSFORM_STATE } from '../../../../../../common/constants';

import { TransformListAction, TransformListRow } from '../../../../common';
import { useStartTransforms } from '../../../../hooks';
import { AuthorizationContext } from '../../../../lib/authorization';

import { isStartActionDisabled } from '../action_start';

export type ResetAction = ReturnType<typeof useReauthorizeAction>;
export const useReauthorizeAction = (forceDisable: boolean, transformNodes: number) => {
  const { canStartStopTransform } = useContext(AuthorizationContext).capabilities;

  const startTransforms = useStartTransforms();

  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformListRow[]>([]);

  const closeModal = () => setModalVisible(false);

  const startAndCloseModal = () => {
    setModalVisible(false);
    startTransforms(items.map((i) => ({ id: i.id })));
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
        <ReauthorizeActionName
          items={[item]}
          forceDisable={forceDisable}
          transformNodes={transformNodes}
        />
      ),
      available: (item: TransformListRow) => item.stats.state === TRANSFORM_STATE.STOPPED,
      enabled: (item: TransformListRow) =>
        !isStartActionDisabled([item], canStartStopTransform, transformNodes),
      description: reauthorizeActionNameText,
      icon: 'alert',
      type: 'icon',
      color: 'warning',
      onClick: (item: TransformListRow) => openModal([item]),
      'data-test-subj': 'transformActionStart',
    }),
    [canStartStopTransform, forceDisable, transformNodes]
  );

  return {
    action,
    closeModal,
    isModalVisible,
    items,
    openModal,
    startAndCloseModal,
  };
};
