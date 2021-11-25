/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Transform } from './transform';
import type { View } from './view';
import type { Datasource } from './datasource';
import type { Model } from './model';

export type ArgType = string;

export type ArgTypeDef = View | Model | Transform | Datasource;

export { Transform, View, Datasource, Model };
export type { Arg } from './arg';

export type ExpressionType = View | Model | Transform;

export type { RenderArgData } from './function_form';
