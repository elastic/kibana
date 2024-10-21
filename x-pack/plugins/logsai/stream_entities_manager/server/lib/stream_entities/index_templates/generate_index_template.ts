/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSET_VERSION } from '../../../../common/constants';

export function generateIndexTemplate(
  id: string,
  composedOf: string[] = [],
  ignoreMissing: string[] = []
) {
  return {
    name: id,
    index_patterns: [`${id}-*`],
    composed_of: [...composedOf, `${id}@layer`],
    priority: 200,
    version: ASSET_VERSION,
    _meta: {
      managed: true,
      description: `The index template for ${id} StreamEntity`,
    },
    data_stream: {
      hidden: false,
    },
    template: {
      settings: {
        index: {
          default_pipeline: `${id}@default-pipeline`,
        },
      },
    },
    allow_auto_create: true,
    ignore_missing_component_templates: [...ignoreMissing, `${id}@layer`],
  };
}
