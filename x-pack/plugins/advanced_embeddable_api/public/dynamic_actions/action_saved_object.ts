/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface SerializedDynamicAction {
  description: string;
  configuration: string;
  type: string;
  title: string;
  embeddableType: string;
  embeddableId: string;
  embeddableTemplateMapping: string;
  id: string;
  triggerId: string;
}
