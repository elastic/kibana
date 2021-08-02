/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { Transform } from './transform';
import type { BaseForm } from './base_form';
export type { Arg } from './arg';
export type { View } from './view';
export type { Datasource } from './datasource';
export type { Model } from './model';

export type ArgType = 'view' | 'model' | 'transform' | 'datasource';

export type ArgTypeDef = BaseForm;
