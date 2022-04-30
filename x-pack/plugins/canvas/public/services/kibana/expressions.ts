/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaPluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';

import { CanvasStartDeps } from '../../plugin';
import { CanvasExpressionsService } from '../expressions';

export type CanvasExpressionsServiceFactory = KibanaPluginServiceFactory<
  CanvasExpressionsService,
  CanvasStartDeps
>;

export const expressionsServiceFactory: CanvasExpressionsServiceFactory = ({ startPlugins }) =>
  startPlugins.expressions;
