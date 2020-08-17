/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useContext, useMemo } from 'react';

import { TRANSFORM_STATE } from '../../../../../../common';

import { AuthorizationContext } from '../../../../lib/authorization';
import { TransformListAction, TransformListRow } from '../../../../common';
import { useStopTransforms } from '../../../../hooks';

import { isStopActionDisabled, stopActionNameText, StopActionName } from './stop_action_name';

export type StopAction = ReturnType<typeof useStopAction>;
export const useStopAction = (forceDisable: boolean) => {
  const { canStartStopTransform } = useContext(AuthorizationContext).capabilities;

  const stopTransforms = useStopTransforms();

  const clickHandler = useCallback((item: TransformListRow) => stopTransforms([item]), [
    stopTransforms,
  ]);

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
      onClick: clickHandler,
      'data-test-subj': 'transformActionStop',
    }),
    [canStartStopTransform, forceDisable, clickHandler]
  );

  return { action };
};
