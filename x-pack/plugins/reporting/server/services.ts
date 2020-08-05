/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createGetterSetter } from '../../../../src/plugins/kibana_utils/server';
import { PluginStart as DataPluginStart } from '../../../../src/plugins/data/server';

export const [getFieldFormats, setFieldFormats] = createGetterSetter<
  DataPluginStart['fieldFormats']
>('FieldFormats');
