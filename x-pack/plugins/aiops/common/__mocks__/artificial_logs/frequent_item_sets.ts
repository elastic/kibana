/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemsetResult } from '../../types';

export const frequentItemSets: ItemsetResult[] = [
  {
    set: { response_code: '500', url: 'home.php' },
    size: 2,
    maxPValue: 0.010770456205312423,
    doc_count: 792,
    support: 0.5262458471760797,
    total_doc_count: 1505,
  },
  {
    set: { user: 'Peter', url: 'home.php' },
    size: 2,
    maxPValue: 0.010770456205312423,
    doc_count: 634,
    support: 0.4212624584717608,
    total_doc_count: 1505,
  },
  {
    set: { response_code: '500', user: 'Mary', url: 'home.php' },
    size: 3,
    maxPValue: 0.010770456205312423,
    doc_count: 396,
    support: 0.26312292358803985,
    total_doc_count: 1505,
  },
  {
    set: { response_code: '500', user: 'Paul', url: 'home.php' },
    size: 3,
    maxPValue: 0.010770456205312423,
    doc_count: 396,
    support: 0.26312292358803985,
    total_doc_count: 1505,
  },
  {
    set: { response_code: '404', user: 'Peter', url: 'home.php' },
    size: 3,
    maxPValue: 0.010770456205312423,
    doc_count: 317,
    support: 0.2106312292358804,
    total_doc_count: 1505,
  },
  {
    set: { response_code: '200', user: 'Peter', url: 'home.php' },
    size: 3,
    maxPValue: 0.010770456205312423,
    doc_count: 317,
    support: 0.2106312292358804,
    total_doc_count: 1505,
  },
];
