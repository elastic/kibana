/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JsonObject } from '../../infra/common/typed_json';
export interface AlertUrlNavigation {
  path: string;
}
export interface AlertStateNavigation {
  state: JsonObject;
}
export type AlertNavigation = AlertUrlNavigation | AlertStateNavigation;
