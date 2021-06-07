/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { ComponentTemplateOptions } from '../definition';
import { commonEcsMappings } from './schema/common_ecs_fields';
import { technicalFieldMappings } from './schema/technical_fields';

/**
 * Based on these options the Event Log mechanism will create and maintain
 * `.alerts-settings` component template.
 */
export const commonSettingsTemplate: ComponentTemplateOptions = {
  version: 1,
  settings: {
    number_of_shards: 1,
    auto_expand_replicas: '0-1',
    'mapping.total_fields.limit': 10000,
    'sort.field': '@timestamp',
    'sort.order': 'desc',
  },
};

/**
 * Based on these options the Event Log mechanism will create and maintain
 * `.alerts-mappings` component template.
 */
export const commonMappingsTemplate: ComponentTemplateOptions = {
  version: 1,
  mappings: merge({}, commonEcsMappings, technicalFieldMappings),
};
