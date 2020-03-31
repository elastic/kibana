/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from '../../../../src/core/server';
import {
  SIGNALS_INDEX_KEY,
  DEFAULT_SIGNALS_INDEX,
  LISTS_INDEX_KEY,
  LISTS_ITEMS_INDEX_KEY,
  DEFAULT_LISTS_INDEX,
  DEFAULT_LISTS_ITEMS_INDEX,
} from '../../../legacy/plugins/siem/common/constants';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  [SIGNALS_INDEX_KEY]: schema.string({ defaultValue: DEFAULT_SIGNALS_INDEX }),
  [LISTS_INDEX_KEY]: schema.string({ defaultValue: DEFAULT_LISTS_INDEX }),
  [LISTS_ITEMS_INDEX_KEY]: schema.string({ defaultValue: DEFAULT_LISTS_ITEMS_INDEX }),
});

export const createConfig$ = (context: PluginInitializerContext) =>
  context.config.create<TypeOf<typeof configSchema>>();

export type ConfigType = ReturnType<typeof createConfig$> extends Observable<infer T>
  ? T
  : ReturnType<typeof createConfig$>;
