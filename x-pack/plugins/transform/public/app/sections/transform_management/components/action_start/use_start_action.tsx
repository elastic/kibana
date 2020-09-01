/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useMemo, useState } from 'react';

import { TRANSFORM_STATE } from '../../../../../../common';

import { AuthorizationContext } from '../../../../lib/authorization';
import { TransformListAction, TransformListRow } from '../../../../common';
import { useStartTransforms } from '../../../../hooks';

import { isStartActionDisabled, startActionNameText, StartActionName } from './start_action_name';

export type StartAction = ReturnType<typeof useStartAction>;
export const useStartAction = (forceDisable: boolean) => {
  const { canStartStopTransform } = useContext(AuthorizationContext).capabilities;

  const startTransforms = useStartTransforms();

  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformListRow[]>([]);

  const closeModal = () => setModalVisible(false);

  const startAndCloseModal = () => {
    setModalVisible(false);
    startTransforms(items);
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
        <StartActionName items={[item]} forceDisable={forceDisable} />
      ),
      available: (item: TransformListRow) => item.stats.state === TRANSFORM_STATE.STOPPED,
      enabled: (item: TransformListRow) => !isStartActionDisabled([item], canStartStopTransform),
      description: startActionNameText,
      icon: 'play',
      type: 'icon',
      onClick: (item: TransformListRow) => openModal([item]),
      'data-test-subj': 'transformActionStart',
    }),
    [canStartStopTransform, forceDisable]
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
