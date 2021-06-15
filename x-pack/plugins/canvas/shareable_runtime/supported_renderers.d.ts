/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionRenderDefinition } from '../../../../src/plugins/expressions/public';

import { RendererFactory } from '../types';

export const renderFunctions: RendererFactory[];
export const renderFunctionNames: string[];
export const addSupportedRenderFunctions: (
  renderers: RendererFactory[] | Array<() => ExpressionRenderDefinition<any>>
) => void;
