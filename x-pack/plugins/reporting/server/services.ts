/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/server';

export const [getFieldFormats, setFieldFormats] =
  createGetterSetter<FieldFormatsStart>('FieldFormats');
