/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemsetResult } from './fetch_frequent_items';

import { getFilteredFrequentItems } from './get_filtered_frequent_items';

const changePoints = [
  {
    fieldName: 'url',
    fieldValue: 'home.php',
    doc_count: 1742,
    bg_count: 632,
    total_doc_count: 4671,
    total_bg_count: 1975,
    score: 4.53094842981472,
    pValue: 0.010770456205312423,
    normalizedScore: 0.10333028878375965,
  },
  {
    fieldName: 'url',
    fieldValue: 'login.php',
    doc_count: 1742,
    bg_count: 632,
    total_doc_count: 4671,
    total_bg_count: 1975,
    score: 4.53094842981472,
    pValue: 0.010770456205312423,
    normalizedScore: 0.10333028878375965,
  },
  {
    fieldName: 'user',
    fieldValue: 'Peter',
    doc_count: 1981,
    bg_count: 553,
    total_doc_count: 4671,
    total_bg_count: 1975,
    score: 47.34435085428873,
    pValue: 2.7454255728359757e-21,
    normalizedScore: 0.8327337555873047,
  },
  {
    fieldName: 'response_code',
    fieldValue: '500',
    doc_count: 1821,
    bg_count: 553,
    total_doc_count: 4671,
    total_bg_count: 1975,
    score: 26.546201745993947,
    pValue: 2.9589053032077285e-12,
    normalizedScore: 0.7814127409489161,
  },
];

const frequentItems: ItemsetResult[] = [
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

const expectedFilteredFrequentItems = [
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
];

describe('getFilteredFrequentItems', () => {
  it('returns histogram query without additional filters', () => {
    expect(getFilteredFrequentItems(frequentItems, changePoints)).toStrictEqual(
      expectedFilteredFrequentItems
    );
  });
});
