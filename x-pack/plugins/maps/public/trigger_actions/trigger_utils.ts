/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'src/plugins/ui_actions/public';

export function isUrlDrilldown(action: Action) {
  return action.type === 'URL_DRILLDOWN';
}
