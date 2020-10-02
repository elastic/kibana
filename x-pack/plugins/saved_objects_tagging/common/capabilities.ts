/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Capabilities } from 'src/core/types';
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
}

export const getTagsCapabilities = (capabilities: Capabilities): TagsCapabilities => {
  const rawCapabilities = capabilities[tagFeatureId];
  return {
    view: (rawCapabilities?.view as boolean) ?? false,
    create: (rawCapabilities?.create as boolean) ?? false,
    edit: (rawCapabilities?.edit as boolean) ?? false,
    delete: (rawCapabilities?.delete as boolean) ?? false,
    assign: (rawCapabilities?.assign as boolean) ?? false,
  };
};
