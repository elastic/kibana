/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface ActionHandler {
  name: string;
  handler: () => void;
}

interface ActionConfigParameter {
  name: string;
  type: string;
}

interface ActionInstance {
  initParams: ActionConfigParameter[];
}
