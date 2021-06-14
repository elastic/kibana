/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { AppNavLinkStatus, AppUpdater, ApplicationStart } from '../../../../src/core/public';
import { CASES_APP_ID } from '../common/const';

export function toggleOverviewLinkInNav(
  updater$: Subject<AppUpdater>,
  casesUpdater$: Subject<AppUpdater>,
  { capabilities }: ApplicationStart
) {
  const { apm, logs, metrics, uptime, [CASES_APP_ID]: cases } = capabilities.navLinks;
  const someVisible = Object.values({ apm, logs, metrics, uptime }).some((visible) => visible);

  // if cases is enabled then we want to show it in the sidebar but not the navigation unless one of the other features
  // is enabled
  if (cases) {
    casesUpdater$.next(() => ({ navLinkStatus: AppNavLinkStatus.visible }));
  }

  if (!someVisible) {
    updater$.next(() => ({
      navLinkStatus: AppNavLinkStatus.hidden,
    }));
  }
}
