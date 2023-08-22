/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo, useState } from 'react';

import { sortTransformsToReauthorize } from './sort_transforms_to_reauthorize';
import { needsReauthorization } from '../../../../common/reauthorization_utils';
import { useReauthorizeTransforms } from '../../../../hooks/use_reauthorize_transform';
import {
  isReauthorizeActionDisabled,
  ReauthorizeActionName,
  reauthorizeActionNameText,
} from './reauthorize_action_name';

import { TransformListAction, TransformListRow } from '../../../../common';
import { AuthorizationContext } from '../../../../lib/authorization';

export type ReauthorizeAction = ReturnType<typeof useReauthorizeAction>;
export const useReauthorizeAction = (forceDisable: boolean, transformNodes: number) => {
  const { canStartStopTransform } = useContext(AuthorizationContext).capabilities;

  const { mutate: reauthorizeTransforms } = useReauthorizeTransforms();

  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformListRow[]>([]);

  const closeModal = () => setModalVisible(false);

  const reauthorizeAndCloseModal = () => {
    setModalVisible(false);
    const { transformIds } = sortTransformsToReauthorize(items);
    reauthorizeTransforms(transformIds);
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
      available: (item: TransformListRow) => needsReauthorization(item),
      enabled: (item: TransformListRow) =>
        !isReauthorizeActionDisabled([item], canStartStopTransform, transformNodes),
      description: reauthorizeActionNameText,
      icon: 'alert',
      type: 'icon',
      color: 'warning',
      onClick: (item: TransformListRow) => openModal([item]),
      'data-test-subj': 'transformActionReauthorize',
    }),
    [canStartStopTransform, forceDisable, transformNodes]
  );

  return {
    action,
    closeModal,
    isModalVisible,
    items,
    openModal,
    reauthorizeAndCloseModal,
  };
};
