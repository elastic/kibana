/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { ML_PAGES } from '../../../common/constants/locator';
import { NotificationsUrlState } from '../../../common/types/locator';

export interface NotificationsAppState {
  level?: string;
}

export function formatNotificationsUrl(
  appBasePath: string,
  pageState: NotificationsUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.NOTIFICATIONS}`;

  if (pageState) {
    const appState: NotificationsAppState = {};
    const globalState = {};

    const { level } = pageState;
    if (!!level) {
      appState.level = level;
    }

    if (isPopulatedObject(globalState)) {
      url = setStateToKbnUrl('_g', globalState, { useHash: false, storeInHashQuery: false }, url);
    }
    if (isPopulatedObject(appState)) {
      url = setStateToKbnUrl('_a', appState, { useHash: false, storeInHashQuery: false }, url);
    }
  }

  return url;
}
