/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { ConfigSchema } from '.';

export function toggleAppLinkInNav(core: CoreStart, { ui }: ConfigSchema) {
  if (ui.enabled === false) {
    core.chrome.navLinks.update('apm', { hidden: true });
  }
}
