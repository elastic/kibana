/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getProductIcon(productName) {
  switch (productName) {
    case 'kibana':
      return 'logoKibana';
    case 'beats':
      return 'logoBeats';
    case 'apm':
      return 'logoAPM';
    case 'elasticsearch':
      return 'logoElasticsearch';
    case 'logstash':
      return 'logoLogstash';
  }
  return '';
}
