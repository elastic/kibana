/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { produce } from 'immer';

const shard1 = {
  id: ['L22w_FX2SbqlQYOP5QrYDg', '.kibana_1', '0'],
  searches: [],
  aggregations: [],
  time: 0.058419,
  color: '#ffafaf',
  relative: '100.00',
  rewrite_time: 14670,
};

const searchRoot = {
  query: null,
  rewrite_time: 14670,
  collector: [
    {
      name: 'CancellableCollector',
      reason: 'search_cancelled',
      time_in_nanos: 14706,
      children: [
        {
          name: 'SimpleTopScoreDocCollector',
          reason: 'search_top_hits',
          time_in_nanos: 7851,
        },
      ],
    },
  ],
  treeRoot: null,
};

const search1 = {
  type: 'ConstantScoreQuery',
  description: 'ConstantScore(DocValuesFieldExistsQuery [field=_primary_term])',
  time_in_nanos: 58419,
  breakdown: [
    {
      key: 'build_scorer',
      time: 40061,
      relative: '68.7',
      color: '#fcc5c5',
      tip:
        'The time taken to create the Scoring object, which is later used to execute the actual scoring of each doc.',
    },
    {
      key: 'create_weight',
      time: 8238,
      relative: '14.1',
      color: '#f6ebeb',
      tip:
        'The time taken to create the Weight object, which holds temporary information during scoring.',
    },
    {
      key: 'next_doc',
      time: 5767,
      relative: '9.9',
      color: '#f6eeee',
      tip: 'The time taken to advance the iterator to the next matching document.',
    },
    {
      key: 'advance',
      time: 2849,
      relative: '4.9',
      color: '#f5f2f2',
      tip: 'The time taken to advance the iterator to the next document.',
    },
    {
      key: 'score',
      time: 1431,
      relative: '2.5',
      color: '#f5f3f3',
      tip: 'The time taken in actually scoring the document against the query.',
    },
    {
      key: 'next_doc_count',
      time: 24,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'score_count',
      time: 24,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'build_scorer_count',
      time: 16,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'advance_count',
      time: 8,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'create_weight_count',
      time: 1,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'compute_max_score',
      time: 0,
      relative: '0.0',
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'compute_max_score_count',
      time: 0,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'match',
      time: 0,
      relative: '0.0',
      color: '#f5f5f5',
      tip:
        'The time taken to execute a secondary, more precise scoring phase (used by phrase queries).',
    },
    {
      key: 'match_count',
      time: 0,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'set_min_competitive_score',
      time: 0,
      relative: '0.0',
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'set_min_competitive_score_count',
      time: 0,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'shallow_advance',
      time: 0,
      relative: '0.0',
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'shallow_advance_count',
      time: 0,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
  ],
  children: [
    /* See search1Child */
  ],
  hasChildren: true,
  selfTime: 0.028784999999999998,
  timePercentage: '100.00',
  absoluteColor: '#ffafaf',
  depth: 0,
  parent: null,
  time: 0.058419,
  lucene: 'ConstantScore(DocValuesFieldExistsQuery [field=_primary_term])',
  query_type: 'ConstantScoreQuery',
  visible: true,
};

const search1Child = {
  type: 'DocValuesFieldExistsQuery',
  description: 'DocValuesFieldExistsQuery [field=_primary_term]',
  time_in_nanos: 29634,
  breakdown: [
    {
      key: 'build_scorer',
      time: 24059,
      relative: '81.3',
      color: '#fdbcbc',
      tip:
        'The time taken to create the Scoring object, which is later used to execute the actual scoring of each doc.',
    },
    {
      key: 'next_doc',
      time: 2434,
      relative: '8.2',
      color: '#f6efef',
      tip: 'The time taken to advance the iterator to the next matching document.',
    },
    {
      key: 'create_weight',
      time: 1586,
      relative: '5.4',
      color: '#f6f1f1',
      tip:
        'The time taken to create the Weight object, which holds temporary information during scoring.',
    },
    {
      key: 'advance',
      time: 1506,
      relative: '5.1',
      color: '#f6f1f1',
      tip: 'The time taken to advance the iterator to the next document.',
    },
    {
      key: 'next_doc_count',
      time: 24,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'build_scorer_count',
      time: 16,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'advance_count',
      time: 8,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'create_weight_count',
      time: 1,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'compute_max_score',
      time: 0,
      relative: '0.0',
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'compute_max_score_count',
      time: 0,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'match',
      time: 0,
      relative: '0.0',
      color: '#f5f5f5',
      tip:
        'The time taken to execute a secondary, more precise scoring phase (used by phrase queries).',
    },
    {
      key: 'match_count',
      time: 0,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'score',
      time: 0,
      relative: '0.0',
      color: '#f5f5f5',
      tip: 'The time taken in actually scoring the document against the query.',
    },
    {
      key: 'score_count',
      time: 0,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'set_min_competitive_score',
      time: 0,
      relative: '0.0',
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'set_min_competitive_score_count',
      time: 0,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'shallow_advance',
      time: 0,
      relative: '0.0',
      color: '#f5f5f5',
      tip: '',
    },
    {
      key: 'shallow_advance_count',
      time: 0,
      relative: 0,
      color: '#f5f5f5',
      tip: '',
    },
  ],
  selfTime: 0.029634,
  timePercentage: '50.73',
  absoluteColor: '#fad1d1',
  depth: 1,
  parent: search1,
  time: 0.029634,
  lucene: 'DocValuesFieldExistsQuery [field=_primary_term]',
  query_type: 'DocValuesFieldExistsQuery',
  visible: true,
};
(search1.children[0] as any) = search1Child;
(searchRoot.treeRoot as any) = search1;
(shard1.searches[0] as any) = searchRoot;

export const processedResponseWithFirstShard = produce<any>(null, () => [
  {
    shards: [shard1],
    time: 0.058419,
    name: '.kibana_1',
    visible: false,
  },
]);
