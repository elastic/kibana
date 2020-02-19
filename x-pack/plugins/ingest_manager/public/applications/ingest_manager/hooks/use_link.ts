/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BASE_PATH } from '../constants';
import { useCore } from './';

export function useLink(path: string = '/') {
  const core = useCore();
  return core.http.basePath.prepend(`${BASE_PATH}#${path}`);
}
