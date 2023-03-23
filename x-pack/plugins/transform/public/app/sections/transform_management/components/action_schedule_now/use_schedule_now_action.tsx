/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo, useState } from 'react';

import { TRANSFORM_STATE } from '../../../../../../common/constants';

import { AuthorizationContext } from '../../../../lib/authorization';
import { TransformListAction, TransformListRow } from '../../../../common';
import { useScheduleNowTransforms } from '../../../../hooks';

import {
  isScheduleNowActionDisabled,
  scheduleNowActionNameText,
  ScheduleNowActionName,
} from './schedule_now_action_name';

export type ScheduleNowAction = ReturnType<typeof useScheduleNowAction>;
export const useScheduleNowAction = (forceDisable: boolean, transformNodes: number) => {
  const { canScheduleNowTransform } = useContext(AuthorizationContext).capabilities;

  const scheduleNowTransforms = useScheduleNowTransforms();

  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformListRow[]>([]);

  const closeModal = () => setModalVisible(false);

  const scheduleNowAndCloseModal = () => {
    setModalVisible(false);
    scheduleNowTransforms(items.map((i) => ({ id: i.id })));
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
        <ScheduleNowActionName
          items={[item]}
          forceDisable={forceDisable}
          transformNodes={transformNodes}
        />
      ),
      available: (item: TransformListRow) => item.stats.state === TRANSFORM_STATE.STARTED,
      enabled: (item: TransformListRow) =>
        !isScheduleNowActionDisabled([item], canScheduleNowTransform, transformNodes),
      description: scheduleNowActionNameText,
      icon: 'play',
      type: 'icon',
      onClick: (item: TransformListRow) => openModal([item]),
      'data-test-subj': 'transformActionScheduleNow',
    }),
    [canScheduleNowTransform, forceDisable, transformNodes]
  );

  return {
    action,
    closeModal,
    isModalVisible,
    items,
    openModal,
    scheduleNowAndCloseModal,
  };
};
