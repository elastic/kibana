/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  MatrixHistogramType,
  NetworkDnsFields,
} from '../../../../../../../common/search_strategy';

export const mockOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  histogramType: MatrixHistogramType.dns,
  isHistogram: true,
  isPtrIncluded: false,
  sort: { field: NetworkDnsFields.uniqueDomains, direction: Direction.desc },
  timerange: { interval: '12h', from: '2020-09-08T15:41:15.528Z', to: '2020-09-09T15:41:15.529Z' },
  stackByField: 'dns.question.registered_domain',
};
