/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ES_FIELD_TYPES } from '../../../../../../src/plugins/data/public';

import { Dictionary } from '../../../common/types/common';

interface EsMappingType {
  type: ES_FIELD_TYPES;
}

export type PreviewItem = Dictionary<any>;
export type PreviewData = PreviewItem[];
export interface PreviewMappings {
  properties: Dictionary<EsMappingType>;
}

export interface GetTransformsResponse {
  preview: PreviewData;
  generated_dest_index: {
    mappings: PreviewMappings;
    // Not in use yet
    aliases: any;
    settings: any;
  };
}
