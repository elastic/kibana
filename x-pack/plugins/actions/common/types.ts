/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ActionType {
  id: string;
  name: string;
  enabled: boolean;
}

export interface ActionResult {
  id: string;
  actionTypeId: string;
  name: string;
  config: Record<string, any>;
}
