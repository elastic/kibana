/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../common/elasticsearch_fieldnames';

export function getApmDataViewAttributes(title: string) {
  return {
    // required fields (even if empty)
    title,
    fieldAttrs: '{}',
    fields: '[]',
    runtimeFieldMap: '{}',
    timeFieldName: '@timestamp',
    typeMeta: '{}',

    // link to APM from Discover
    fieldFormatMap: JSON.stringify({
      [TRACE_ID]: {
        id: 'url',
        params: {
          urlTemplate: 'apm/link-to/trace/{{value}}',
          labelTemplate: '{{value}}',
        },
      },
      [TRANSACTION_ID]: {
        id: 'url',
        params: {
          urlTemplate: 'apm/link-to/transaction/{{value}}',
          labelTemplate: '{{value}}',
        },
      },
    }),
  };
}
