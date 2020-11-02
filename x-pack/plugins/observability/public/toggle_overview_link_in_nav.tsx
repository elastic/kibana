/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';
import { AppNavLinkStatus, AppUpdater, ApplicationStart } from '../../../../src/core/public';

export function toggleOverviewLinkInNav(
  updater$: Subject<AppUpdater>,
  { capabilities }: ApplicationStart
) {
  const { apm, logs, metrics, uptime } = capabilities.navLinks;
  const someVisible = Object.values({ apm, logs, metrics, uptime }).some((visible) => visible);
  if (!someVisible) {
    updater$.next(() => ({
      navLinkStatus: AppNavLinkStatus.hidden,
    }));
  }
}
