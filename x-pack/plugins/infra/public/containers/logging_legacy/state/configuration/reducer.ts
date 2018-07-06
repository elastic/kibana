/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ConfigurationState {
  server: {
    httpBasePath: string;
    httpHeaders: {
      [header: string]: string;
    };
  };
}

export const initialConfigurationState: ConfigurationState = {
  server: {
    httpBasePath: '/',
    httpHeaders: {},
  },
};

export const configurationReducer = (
  state: ConfigurationState = initialConfigurationState
): ConfigurationState => state;
