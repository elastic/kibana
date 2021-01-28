/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type CallOutType = 'primary' | 'success' | 'warning' | 'danger';

export interface CallOutMessage {
  type: CallOutType;
  id: string;
  title: string;
  description: JSX.Element;
}
