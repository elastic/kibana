/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { isTransformListRowWithStats } from '../../../../common/transform_list';
import { TRANSFORM_STATE } from '../../../../../../common/constants';

import { useTransformCapabilities } from '../../../../hooks';
import type { TransformListAction, TransformListRow } from '../../../../common';
import { useScheduleNowTransforms } from '../../../../hooks';

import {
  isScheduleNowActionDisabled,
  scheduleNowActionNameText,
  ScheduleNowActionName,
} from './schedule_now_action_name';

export type ScheduleNowAction = ReturnType<typeof useScheduleNowAction>;
export const useScheduleNowAction = (forceDisable: boolean, transformNodes: number) => {
  const { canScheduleNowTransform } = useTransformCapabilities();
  const scheduleNowTransforms = useScheduleNowTransforms();

  const action: TransformListAction = useMemo(
    () => ({
      name: (item: TransformListRow) => (
        <ScheduleNowActionName
          items={[item]}
          forceDisable={forceDisable}
          transformNodes={transformNodes}
        />
      ),
      available: (item: TransformListRow) =>
        isTransformListRowWithStats(item) ? item.stats.state === TRANSFORM_STATE.STARTED : true,
      enabled: (item: TransformListRow) =>
        isTransformListRowWithStats(item) &&
        !isScheduleNowActionDisabled([item], canScheduleNowTransform, transformNodes),
      description: scheduleNowActionNameText,
      icon: 'play',
      type: 'icon',
      onClick: (item: TransformListRow) => scheduleNowTransforms([{ id: item.id }]),
      'data-test-subj': 'transformActionScheduleNow',
    }),
    [canScheduleNowTransform, forceDisable, scheduleNowTransforms, transformNodes]
  );

  return {
    action,
    scheduleNowTransforms,
  };
};
