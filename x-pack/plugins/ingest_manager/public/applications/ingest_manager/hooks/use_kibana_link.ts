/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCore } from './';

const KIBANA_BASE_PATH = '/app/kibana';

export function useKibanaLink(path: string = '/') {
  const core = useCore();
  return core.http.basePath.prepend(`${KIBANA_BASE_PATH}#${path}`);
}
