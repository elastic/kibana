/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { APM_SERVICE_GROUP_SAVED_OBJECT_TYPE } from '../../common/service_groups';

export const apmServiceGroups: SavedObjectsType = {
  name: APM_SERVICE_GROUP_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    properties: {
      groupName: { type: 'keyword' },
      kuery: { type: 'text' },
      description: { type: 'text' },
      serviceNames: { type: 'keyword' },
      color: { type: 'text' },
    },
  },
  management: {
    importableAndExportable: false,
    icon: 'apmApp',
    getTitle: () =>
      i18n.translate('xpack.apm.apmServiceGroups.index', {
        defaultMessage: 'APM Service Groups - Index',
      }),
  },
};
