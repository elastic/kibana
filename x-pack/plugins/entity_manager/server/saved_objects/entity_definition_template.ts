/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsType } from '@kbn/core/server';
import { EntityDefinitionTemplate } from '@kbn/entities-schema';

export const SO_ENTITY_DEFINITION_TEMPLATE_TYPE = 'entity-definition-template';

export const entityDefinitionTemplate: SavedObjectsType = {
  name: SO_ENTITY_DEFINITION_TEMPLATE_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      version: { type: 'keyword' },
      type: { type: 'keyword' },
    },
  },
  management: {
    displayName: 'Entity Definition Template',
    getInAppUrl: (savedObject) => {
      return {
        path: `/app/entities#/create?template=${savedObject.id}`,
        uiCapabilitiesPath: '',
      };
    },
    importableAndExportable: true,
    getTitle(savedObject: SavedObject<EntityDefinitionTemplate>) {
      return `EntityDefinitionTemplate: [${savedObject.attributes.name}]`;
    },
  },
};
