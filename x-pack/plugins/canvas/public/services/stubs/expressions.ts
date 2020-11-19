/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyExpressionRenderDefinition } from 'src/plugins/expressions';
import { ExpressionsService } from '../';
import { plugin } from '../../../../../../src/plugins/expressions/public';
import { functions as functionDefinitions } from '../../../canvas_plugin_src/functions/common';
import { renderFunctions } from '../../../canvas_plugin_src/renderers/core';

const placeholder = {} as any;
const expressionsPlugin = plugin(placeholder);
const setup = expressionsPlugin.setup(placeholder);

export const expressionsService: ExpressionsService = setup.fork();

functionDefinitions.forEach((fn) => expressionsService.registerFunction(fn));
renderFunctions.forEach((fn) => {
  expressionsService.registerRenderer((fn as unknown) as AnyExpressionRenderDefinition);
});
