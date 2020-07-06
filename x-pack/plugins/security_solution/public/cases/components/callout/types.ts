/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ErrorMessage {
  id: string;
  title: string;
  description: JSX.Element;
  errorType?: 'primary' | 'success' | 'warning' | 'danger';
}
