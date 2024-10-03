/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { knowledgeBaseProductDocInstallTypeName } from '../../common/consts';
import type { ProductDocInstallStatus } from '../../common/saved_objects';

/**
 * Interface describing the raw attributes of the KB Entry SO type.
 * Contains more fields than the mappings, which only list
 * indexed fields.
 */
export interface KnowledgeBaseProductDocInstallAttributes {
  package_name: string;
  package_version: string;
  product_name: string;
  installation_status: ProductDocInstallStatus;
  last_installation_date: number | undefined;
  index_name: string;
}

export const knowledgeBaseProductDocInstallSavedObjectType: SavedObjectsType<KnowledgeBaseProductDocInstallAttributes> =
  {
    name: knowledgeBaseProductDocInstallTypeName,
    hidden: true,
    namespaceType: 'multiple',
    mappings: {
      dynamic: false,
      properties: {
        package_name: { type: 'keyword' },
        package_version: { type: 'keyword' },
        product_name: { type: 'keyword' },
        installation_status: { type: 'keyword' },
        last_installation_date: { type: 'integer' },
        index_name: { type: 'keyword' },
      },
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {},
  };
