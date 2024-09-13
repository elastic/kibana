/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { SavedObjectMigrationFn } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { APM_SERVICE_GROUP_SAVED_OBJECT_TYPE } from '../../common/service_groups';

interface ApmServiceGroupsPre850 {
  groupName: string;
  kuery: string;
  description: string;
  serviceNames: string[];
  color: string;
}

interface ApmServiceGroups {
  groupName: string;
  kuery: string;
  description: string;
  color: string;
}

const migrateApmServiceGroups850: SavedObjectMigrationFn<
  ApmServiceGroupsPre850,
  ApmServiceGroups
> = (doc) => {
  const { serviceNames, ...rest } = doc.attributes;
  return {
    ...doc,
    attributes: {
      ...rest,
    },
  };
};

export const apmServiceGroups: SavedObjectsType = {
  name: APM_SERVICE_GROUP_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    properties: {
      groupName: { type: 'keyword' },
      kuery: { type: 'text' },
      description: { type: 'text' },
      color: { type: 'text' },
    },
  },
  management: {
    importableAndExportable: true,
    icon: 'apmApp',
    getTitle: (savedObject) =>
      `${i18n.translate('xpack.apm.apmServiceGroups.title', {
        defaultMessage: 'Service Group',
      })}: ${savedObject.attributes.groupName}`,
    getInAppUrl: (savedObject) => ({
      path: `/app/apm/services?serviceGroup=${savedObject.id}`,
      uiCapabilitiesPath: 'apm.show',
    }),
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        create: schema.object({
          groupName: schema.string(),
          kuery: schema.string(),
          description: schema.maybe(schema.string()),
          color: schema.maybe(schema.string()),
        }),
      },
    },
  },
  migrations: {
    '8.5.0': migrateApmServiceGroups850,
  },
};
