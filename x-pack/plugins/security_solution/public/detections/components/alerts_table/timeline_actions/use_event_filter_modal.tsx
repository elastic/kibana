/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { FlyoutTypes, useSecurityFlyout } from '../../flyouts';
import { Ecs } from '../../../../../common/ecs';

interface IProps extends Record<string, unknown> {
  ecsData: Ecs | null;
}

export const useEventFilterModal = (props: IProps) => {
  const { flyoutDispatch } = useSecurityFlyout();

  const closeAddEventFilterModal = useCallback((): void => {
    flyoutDispatch({ type: null });
  }, [flyoutDispatch]);

  const onAddEventFilterClick = useCallback((): void => {
    if (props.ecsData != null) {
      flyoutDispatch({
        type: FlyoutTypes.EVENT_FILTER,
        payload: {
          ...props,
          closeAddEventFilterModal,
          ecsData: props.ecsData as Ecs,
        },
      });
    }
  }, [closeAddEventFilterModal, flyoutDispatch, props]);

  return { onAddEventFilterClick };
};
