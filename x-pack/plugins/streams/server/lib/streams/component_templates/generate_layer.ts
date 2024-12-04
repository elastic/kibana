/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ClusterPutComponentTemplateRequest,
  MappingDateProperty,
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
    const property: MappingProperty = {
      type: field.type,
    };
    if (field.name === '@timestamp') {
      // @timestamp can't ignore malformed dates as it's used for sorting in logsdb
      (property as MappingDateProperty).ignore_malformed = false;
    }
    properties[field.name] = property;
  });
  return {
    name: getComponentTemplateName(id),
    template: {
      settings: isRoot(definition.id) ? logsSettings : {},
      mappings: {
        subobjects: false,
        dynamic: false,
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
