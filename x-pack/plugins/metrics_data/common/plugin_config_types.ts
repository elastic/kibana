/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface InfraConfig {
  sources?: {
    default?: {
      fields?: {
        message?: string[];
      };
    };
  };
}

export const publicConfigKeys = {
  sources: true,
} as const;

export type InfraPublicConfigKey = keyof {
  [K in keyof typeof publicConfigKeys as typeof publicConfigKeys[K] extends true ? K : never]: true;
};

export type InfraPublicConfig = Pick<InfraConfig, InfraPublicConfigKey>;
