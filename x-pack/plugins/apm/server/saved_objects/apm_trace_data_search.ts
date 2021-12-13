/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { APM_TRACE_DATA_SEARCH_SAVED_OBJECT_TYPE } from '../../common/apm_saved_object_constants';

export interface TraceDataSearchSavedObjectType {
  taskId: string;
  search: string;
}

export const apmTraceDataSearch: SavedObjectsType = {
  name: APM_TRACE_DATA_SEARCH_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: {
      taskId: {
        type: 'keyword',
      },
      search: {
        type: 'text',
        index: false,
      },
    },
  },
  management: {
    importableAndExportable: false,
    icon: 'apmApp',
    getTitle: () =>
      i18n.translate('xpack.apm.traceDataSearch', {
        defaultMessage: 'APM Trace Data Search',
      }),
  },
};
