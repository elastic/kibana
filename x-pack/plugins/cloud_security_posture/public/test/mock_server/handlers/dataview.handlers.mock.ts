/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { http, HttpResponse } from 'msw';

const generateDataViewField = (name: string, type: 'string' | 'date' = 'string') => ({
  name,
  type,
  esTypes: [type === 'string' ? 'keyword' : 'date'],
  searchable: true,
  aggregatable: true,
  readFromDocValues: true,
  metadata_field: false,
});

export const defaultDataViewFindHandler = http.get(
  'http://localhost/internal/data_views/fields',
  ({ request }) => {
    const url = new URL(request.url);
    const pattern = url.searchParams.get('pattern');

    if (pattern === 'logs-cloud_security_posture.findings_latest-*') {
      return HttpResponse.json({
        fields: [
          generateDataViewField('@timestamp', 'date'),
          generateDataViewField('resource.id'),
          generateDataViewField('resource.name'),
          generateDataViewField('resource.sub_type'),
          generateDataViewField('result.evaluation'),
          generateDataViewField('rule.benchmark.rule_number'),
          generateDataViewField('rule.name'),
          generateDataViewField('rule.section'),
        ],
        indices: ['logs-cloud_security_posture.findings_latest-default'],
      });
    }

    return HttpResponse.json({
      fields: [],
      indices: [],
    });
  }
);
