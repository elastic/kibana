/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';

let navigateToApp: CoreStart['application']['navigateToApp'];

export function init(_navigateToApp: CoreStart['application']['navigateToApp']) {
  navigateToApp = _navigateToApp;
}

export function redirect(path: string) {
  navigateToApp('management', { path });
}
