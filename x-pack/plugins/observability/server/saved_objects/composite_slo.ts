/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SavedObject } from '@kbn/core/server';

import { StoredCompositeSLO } from '../domain/models/composite_slo';

export const SO_COMPOSITE_SLO_TYPE = 'composite-slo';

export const compositeSlo: SavedObjectsType = {
  name: SO_COMPOSITE_SLO_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      name: { type: 'text' },
      budgetingMethod: { type: 'keyword' },
      compositeMethod: { type: 'keyword' },
      sources: {
        properties: {
          id: { type: 'keyword' },
          revision: { type: 'integer' },
        },
      },
      tags: { type: 'keyword' },
    },
  },
  management: {
    displayName: 'Composite SLO',
    importableAndExportable: true,
    getTitle(compositeSloSavedObject: SavedObject<StoredCompositeSLO>) {
      return `Composite SLO: [${compositeSloSavedObject.attributes.name}]`;
    },
  },
};
