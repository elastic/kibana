/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface ActionConfigParameter {
  name: string;
  type: string;
}

interface ActionType {
  name: string;
  initParams: ActionConfigParameter[];
  executionParams: ActionConfigParameter[];
}

interface ActionConnector {
  actionType: string;
  connectorType: string;
  handler: (params: any) => Promise<void>;
}

interface ActionExecution {
  action: string;
  actionType: string;
  params: any;
}

interface ActionSavedObjectInstance {
  name: string;
  actionType: string;
  instanceParams: any;
}

interface ActionInstance<T> {
  name: string;
  actionType: string;
  connectorType: string;
  params: any;
  connectorParams: T;
}
