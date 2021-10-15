/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Injectable, IDirectiveFactory, IScope, IAttributes, IController } from 'angular';

export const createTopNavDirective: Injectable<
  IDirectiveFactory<IScope, JQLite, IAttributes, IController>
>;
export const createTopNavHelper: (
  options: unknown
) => Injectable<IDirectiveFactory<IScope, JQLite, IAttributes, IController>>;
export function loadKbnTopNavDirectives(navUi: unknown): void;
