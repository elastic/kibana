/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';

export function useKibanaUrl(
  /** The path to the plugin */ path: string,
  /** The hash path */ hash?: string
) {
  const { core } = useApmPluginContext();
  return url.format({
    pathname: core.http.basePath.prepend(path),
    hash,
  });
}
