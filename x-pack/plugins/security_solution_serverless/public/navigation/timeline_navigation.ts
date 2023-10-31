/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { withLatestFrom } from 'rxjs';
import type { Services } from '../common/services';

export const subscribeTimelineNavigation = (services: Services) => {
  const { chrome, securitySolution } = services;
  const isSideNavCollapsed$ = chrome.getIsSideNavCollapsed$();

  // to prevent collapsing the sidenav when page loads and emits `isTimelineOpen: false` for the first time
  let timelineHasOpened = false;

  securitySolution
    .getIsTimelineOpen$()
    .pipe(withLatestFrom(isSideNavCollapsed$))
    .subscribe(([isTimelineOpen, isSideNavCollapsed]) => {
      if (!timelineHasOpened && isTimelineOpen && !isSideNavCollapsed) {
        chrome.setIsSideNavCollapsed(true);
        timelineHasOpened = true;
      } else if (timelineHasOpened && !isTimelineOpen && isSideNavCollapsed) {
        chrome.setIsSideNavCollapsed(false);
        timelineHasOpened = false;
      }
    });
};
