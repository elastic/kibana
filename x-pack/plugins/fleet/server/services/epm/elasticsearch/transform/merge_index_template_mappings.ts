/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexTemplate } from '../../../../../common/types';

export const mergeIndexTemplateWithMappings = (
  destinationIndexTemplate?: Record<string, unknown>,
  mappings?: Record<string, unknown>
): IndexTemplate['template'] | undefined => {
  if (destinationIndexTemplate === undefined && mappings === undefined) return;

  const destinationIndexTemplateMappings =
    destinationIndexTemplate !== undefined &&
    destinationIndexTemplate?.mappings !== null &&
    typeof destinationIndexTemplate.mappings === 'object'
      ? destinationIndexTemplate.mappings
      : {};
  return {
    ...(destinationIndexTemplate !== undefined ? destinationIndexTemplate : {}),
    ...(destinationIndexTemplate?.mappings !== undefined || mappings !== undefined
      ? {
          mappings: {
            ...destinationIndexTemplateMappings,
            ...mappings,
          },
        }
      : {}),
  } as IndexTemplate['template'];
};
