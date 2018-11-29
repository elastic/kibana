/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Config {
  get(key: string): string | boolean | number | null | undefined;
}

export function getSpaceSelectorUrl(serverConfig: Config) {
  return serverConfig.get('server.basePath') || '/';
}
