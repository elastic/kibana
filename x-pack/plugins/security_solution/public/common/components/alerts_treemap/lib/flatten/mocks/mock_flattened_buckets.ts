/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenedBucket } from '../../../types';

export const flattenedBuckets: FlattenedBucket[] = [
  {
    doc_count: 34,
    key: 'matches everything',
    maxRiskSubAggregation: { value: 21 },
    stackByField1Key: 'Host-k8iyfzraq9',
    stackByField1DocCount: 12,
  },
  {
    doc_count: 34,
    key: 'matches everything',
    maxRiskSubAggregation: { value: 21 },
    stackByField1Key: 'Host-ao1a4wu7vn',
    stackByField1DocCount: 10,
  },
  {
    doc_count: 34,
    key: 'matches everything',
    maxRiskSubAggregation: { value: 21 },
    stackByField1Key: 'Host-3fbljiq8rj',
    stackByField1DocCount: 7,
  },
  {
    doc_count: 34,
    key: 'matches everything',
    maxRiskSubAggregation: { value: 21 },
    stackByField1Key: 'Host-r4y6xi92ob',
    stackByField1DocCount: 5,
  },
  {
    doc_count: 28,
    key: 'EQL process sequence',
    maxRiskSubAggregation: { value: 73 },
    stackByField1Key: 'Host-k8iyfzraq9',
    stackByField1DocCount: 10,
  },
  {
    doc_count: 28,
    key: 'EQL process sequence',
    maxRiskSubAggregation: { value: 73 },
    stackByField1Key: 'Host-ao1a4wu7vn',
    stackByField1DocCount: 7,
  },
  {
    doc_count: 28,
    key: 'EQL process sequence',
    maxRiskSubAggregation: { value: 73 },
    stackByField1Key: 'Host-3fbljiq8rj',
    stackByField1DocCount: 5,
  },
  {
    doc_count: 28,
    key: 'EQL process sequence',
    maxRiskSubAggregation: { value: 73 },
    stackByField1Key: 'Host-r4y6xi92ob',
    stackByField1DocCount: 3,
  },
  {
    doc_count: 19,
    key: 'Endpoint Security',
    maxRiskSubAggregation: { value: 47 },
    stackByField1Key: 'Host-ao1a4wu7vn',
    stackByField1DocCount: 11,
  },
  {
    doc_count: 19,
    key: 'Endpoint Security',
    maxRiskSubAggregation: { value: 47 },
    stackByField1Key: 'Host-3fbljiq8rj',
    stackByField1DocCount: 6,
  },
  {
    doc_count: 19,
    key: 'Endpoint Security',
    maxRiskSubAggregation: { value: 47 },
    stackByField1Key: 'Host-k8iyfzraq9',
    stackByField1DocCount: 1,
  },
  {
    doc_count: 19,
    key: 'Endpoint Security',
    maxRiskSubAggregation: { value: 47 },
    stackByField1Key: 'Host-r4y6xi92ob',
    stackByField1DocCount: 1,
  },
  {
    doc_count: 5,
    key: 'mimikatz process started',
    maxRiskSubAggregation: { value: 99 },
    stackByField1Key: 'Host-k8iyfzraq9',
    stackByField1DocCount: 3,
  },
  {
    doc_count: 5,
    key: 'mimikatz process started',
    maxRiskSubAggregation: { value: 99 },
    stackByField1Key: 'Host-3fbljiq8rj',
    stackByField1DocCount: 1,
  },
  {
    doc_count: 5,
    key: 'mimikatz process started',
    maxRiskSubAggregation: { value: 99 },
    stackByField1Key: 'Host-r4y6xi92ob',
    stackByField1DocCount: 1,
  },
  {
    doc_count: 2,
    key: 'Has Slack Interval Action',
    maxRiskSubAggregation: { value: 21 },
    stackByField1Key: 'Host-k8iyfzraq9',
    stackByField1DocCount: 1,
  },
  {
    doc_count: 2,
    key: 'Has Slack Interval Action',
    maxRiskSubAggregation: { value: 21 },
    stackByField1Key: 'Host-ryqxt6jjy2',
    stackByField1DocCount: 1,
  },
  {
    doc_count: 1,
    key: 'Threshold rule',
    maxRiskSubAggregation: { value: 99 },
    stackByField1Key: 'Host-r4y6xi92ob',
    stackByField1DocCount: 1,
  },
];
