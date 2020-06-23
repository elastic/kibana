/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface AlertType {
  id: string;
  name: string;
  actionGroups: ActionGroup[];
  actionVariables: string[];
  defaultActionGroupId: ActionGroup['id'];
  producer: string;
}

export interface ActionGroup {
  id: string;
  name: string;
}
