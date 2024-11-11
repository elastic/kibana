/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ClusterPutComponentTemplateRequest,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import { StreamDefinition } from '../../../../common/types';
import { ASSET_VERSION } from '../../../../common/constants';
import { logsSettings } from './logs_layer';
import { isRoot } from '../helpers/hierarchy';
import { getComponentTemplateName } from './name';

export function generateLayer(
  id: string,
  definition: StreamDefinition
): ClusterPutComponentTemplateRequest {
  const properties: Record<string, MappingProperty> = {};
  definition.fields.forEach((field) => {
    properties[field.name] = {
      type: field.type,
    };
  });
  return {
    name: getComponentTemplateName(id),
    template: {
      settings: isRoot(definition.id) ? logsSettings : {},
      mappings: {
        subobjects: false,
        properties,
      },
    },
    version: ASSET_VERSION,
    _meta: {
      managed: true,
      description: `Default settings for the ${id} stream`,
    },
  };
}
