/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { safeDump } from 'js-yaml';

import type { AssetOptions } from './generate';

export const createManifest = (assetOptions: AssetOptions) => {
  const {
    format_version: formatVersion,
    name,
    title,
    description,
    version,
    owner,
    kibanaVersion,
  } = assetOptions;

  const manifest = {
    format_version: formatVersion,
    name,
    title,
    description,
    version,
    owner,
    type: 'integration' as const,
    conditions: {
      kibana: {
        version: kibanaVersion,
      },
    },
  };

  return safeDump(manifest);
};
