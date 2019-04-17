/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getKibanaInstructions } from './kibana_instructions';
import { getElasticsearchInstructions } from './elasticsearch_instructions';

export function getInstructionSteps(productName, product, opts) {
  switch (productName) {
    case 'kibana':
      return getKibanaInstructions(product, opts);
    case 'elasticsearch':
      return getElasticsearchInstructions(product, opts);

  }
  return [];
}
