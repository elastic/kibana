/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Handler } from './typings/data_handler';
import { ObservabilityApp } from '../typings/common';

const handlers: Partial<Record<ObservabilityApp, Handler>> = {};

export type RegisterHandler = (params: { name: ObservabilityApp; handler: Handler }) => void;
export const registerHandler: RegisterHandler = ({ name, handler }) => {
  handlers[name] = handler;
};

export function getHandler(name: ObservabilityApp): Handler | undefined {
  return handlers[name];
}
