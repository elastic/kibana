/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';

export function toggleOverviewLinkInNav(core: CoreStart) {
  const { apm, logs, metrics, uptime } = core.application.capabilities.navLinks;
  const someVisible = Object.values({ apm, logs, metrics, uptime }).some((visible) => visible);
  if (!someVisible) {
    core.chrome.navLinks.update('observability-overview', { hidden: true });
  }
}
