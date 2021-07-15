/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { revealImageRenderer } from '../../../../../src/plugins/expression_reveal_image/public';
import { errorRenderer, debugRenderer } from '../../../../../src/plugins/expression_error/public';

export const renderFunctions = [revealImageRenderer, errorRenderer, debugRenderer];
export const renderFunctionFactories = [];
