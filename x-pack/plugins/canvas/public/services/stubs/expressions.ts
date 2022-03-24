/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyExpressionRenderDefinition } from 'src/plugins/expressions';
import { plugin } from '../../../../../../src/plugins/expressions/public';
import { functions as functionDefinitions } from '../../../canvas_plugin_src/functions/common';
import { renderFunctions } from '../../../canvas_plugin_src/renderers/core';
import { PluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';
import {
  CanvasExpressionsService,
  CanvasExpressionsServiceRequiredServices,
  ExpressionsService,
} from '../kibana/expressions';

type CanvasExpressionsServiceFactory = PluginServiceFactory<
  CanvasExpressionsService,
  {},
  CanvasExpressionsServiceRequiredServices
>;

export const expressionsServiceFactory: CanvasExpressionsServiceFactory = (
  params,
  requiredServices
) => {
  const placeholder = {} as any;
  const expressionsPlugin = plugin(placeholder);
  const setup = expressionsPlugin.setup(placeholder);
  const fork = setup.fork('canvas');
  const expressionsService = fork.setup();

  functionDefinitions.forEach((fn) => expressionsService.registerFunction(fn));
  renderFunctions.forEach((fn) => {
    setup.registerRenderer(fn as unknown as AnyExpressionRenderDefinition);
  });

  return new ExpressionsService(fork.start(), requiredServices);
};
