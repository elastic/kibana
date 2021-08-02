/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Datasource as DatasourceClass,
  Model as ModelClass,
  View as ViewClass,
  Arg as ArgClass,
  BaseForm as BaseFormClass,
  // @ts-expect-error unconverted class
} from './';

export type { Transform } from './transform';
import type { BaseForm } from './base_form';

export type Datasource = typeof DatasourceClass;
export type Model = typeof ModelClass;
export type View = typeof ViewClass;
export type Arg = typeof ArgClass;
export type ArgType = 'view' | 'model' | 'transform' | 'datasource';

export type ArgTypeDef = BaseForm;
