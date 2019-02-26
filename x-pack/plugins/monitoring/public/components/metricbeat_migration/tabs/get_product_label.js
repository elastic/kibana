/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getProductLabel(productName) {
  switch (productName) {
    case 'kibana':
      return 'Kibana';
    case 'beats':
      return 'Beats';
    case 'apm':
      return 'APM';
    case 'elasticsearch':
      return 'Elasticsearch';
    case 'logstash':
      return 'Logstash';
  }
  return '';
}
