/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export interface KbnServer {
  config: () => ConfigObject;
}

export interface ConfigObject {
  get: (path: string) => any;
}

export interface Size {
  width: number;
  height: number;
}

export interface Logger {
  debug: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}
