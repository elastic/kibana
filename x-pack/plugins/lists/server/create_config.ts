/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map } from 'rxjs/operators';
import { PluginInitializerContext } from 'kibana/server';
import { Observable } from 'rxjs';

import { ConfigType } from './config';

export const createConfig$ = (
  context: PluginInitializerContext
): Observable<Readonly<ConfigType>> => {
  return context.config.create<ConfigType>().pipe(map((config) => config));
};
