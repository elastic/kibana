/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  BEATS_SYSTEM_ID,
  ELASTICSEARCH_SYSTEM_ID,
  KIBANA_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
  APM_SYSTEM_ID,
} from '../../../common/constants';

export function getListingLinkForStackProduct(stackProduct: string) {
  switch (stackProduct) {
    case ELASTICSEARCH_SYSTEM_ID:
      return 'elasticsearch/nodes';
    case LOGSTASH_SYSTEM_ID:
      return 'logstash/nodes';
    case KIBANA_SYSTEM_ID:
      return 'kibana/instances';
    case BEATS_SYSTEM_ID:
      return 'beats/beats';
    case APM_SYSTEM_ID:
      return 'apm/instances';
  }
  return '';
}
