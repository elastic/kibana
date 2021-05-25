/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '../../../../src/plugins/kibana_utils/common';

export interface AlertUrlNavigation {
  path: string;
}
export interface AlertStateNavigation {
  state: JsonObject;
}
export type AlertNavigation = AlertUrlNavigation | AlertStateNavigation;
