/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { useWhichFlyout } from '../../document_details/shared/hooks/use_which_flyout';
import { Flyouts } from '../../document_details/shared/constants/flyouts';
import { SECURITY_SOLUTION_ON_CLOSE_EVENT, TIMELINE_ON_CLOSE_EVENT } from '../..';

export interface UseOnCloseParams {
  /**
   * Function to call when the event is dispatched
   */
  callback: (id: string) => void;
}

/**
 * Hook to abstract the logic of listening to the onClose event for the Security Solution application.
 * The kbn-expandable-flyout package provides the onClose callback, but has there are only 2 instances of the expandable flyout in Security Solution (normal and timeline)
 * we need a way to propagate the onClose event to all other components.
 * 2 event names are available, we pick the correct one depending on which flyout is open (if the timeline flyout is open, it is always on top, so we choose that one).
 */
export const useOnExpandableFlyoutClose = ({ callback }: UseOnCloseParams): void => {
  const flyout = useWhichFlyout();

  const eventName =
    flyout === Flyouts.securitySolution
      ? SECURITY_SOLUTION_ON_CLOSE_EVENT
      : TIMELINE_ON_CLOSE_EVENT;

  const eventHandler = useCallback((e: CustomEventInit) => callback(e.detail), [callback]);

  useEffect(() => {
    window.addEventListener(eventName, eventHandler);

    return () => window.removeEventListener(eventName, eventHandler);
  }, [eventHandler, eventName]);
};
