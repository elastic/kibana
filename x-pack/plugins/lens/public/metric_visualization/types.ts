/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface State {
  layerId: string;
  accessor?: string;
}

export interface MetricConfig extends State {
  title: string;
  mode: 'reduced' | 'full';
}
