/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Capabilities } from '@kbn/core/types';
import { tagFeatureId } from './constants';

/**
 * Represent the UI capabilities for the `savedObjectsTagging` section of `Capabilities`
 */
export interface TagsCapabilities {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  assign: boolean;
  viewConnections: boolean;
}

export const getTagsCapabilities = (capabilities: Capabilities): TagsCapabilities => {
  const rawTagCapabilities = capabilities[tagFeatureId];
  return {
    view: (rawTagCapabilities?.view as boolean) ?? false,
    create: (rawTagCapabilities?.create as boolean) ?? false,
    edit: (rawTagCapabilities?.edit as boolean) ?? false,
    delete: (rawTagCapabilities?.delete as boolean) ?? false,
    assign: (rawTagCapabilities?.assign as boolean) ?? false,
    viewConnections: (capabilities.savedObjectsManagement?.read as boolean) ?? false,
  };
};
