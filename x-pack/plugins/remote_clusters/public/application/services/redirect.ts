/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';

let navigateToApp: CoreStart['application']['navigateToApp'];

export function init(_navigateToApp: CoreStart['application']['navigateToApp']) {
  navigateToApp = _navigateToApp;
}

export function redirect(path: string) {
  navigateToApp('kibana', { path: `#${path}` });
}
