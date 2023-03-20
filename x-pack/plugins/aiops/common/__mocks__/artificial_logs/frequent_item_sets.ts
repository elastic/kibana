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
    support: 0.27021494370522003,
    total_doc_count: 2931,
  },
  {
    set: { response_code: '500', url: 'login.php' },
    size: 2,
    maxPValue: 0.010770456205312423,
    doc_count: 792,
    support: 0.27021494370522003,
    total_doc_count: 2931,
  },
  {
    set: { user: 'Peter', url: 'home.php' },
    size: 2,
    maxPValue: 0.010770456205312423,
    doc_count: 634,
    support: 0.21630842715796655,
    total_doc_count: 2931,
  },
  {
    set: { user: 'Peter', url: 'login.php' },
    size: 2,
    maxPValue: 0.010770456205312423,
    doc_count: 634,
    support: 0.21630842715796655,
    total_doc_count: 2931,
  },
  {
    set: { response_code: '500', user: 'Peter' },
    size: 2,
    maxPValue: 2.9589053032077285e-12,
    doc_count: 79,
    support: 0.026953258273626747,
    total_doc_count: 2931,
  },
];
