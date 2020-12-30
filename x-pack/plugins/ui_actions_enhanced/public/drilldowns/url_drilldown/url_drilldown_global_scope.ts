/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import { UrlDrilldownGlobalScope } from './types';

interface UrlDrilldownGlobalScopeDeps {
  core: CoreSetup;
}

export function globalScopeProvider({
  core,
}: UrlDrilldownGlobalScopeDeps): () => UrlDrilldownGlobalScope {
  return () => ({
    kibanaUrl: window.location.origin + core.http.basePath.get(),
  });
}
