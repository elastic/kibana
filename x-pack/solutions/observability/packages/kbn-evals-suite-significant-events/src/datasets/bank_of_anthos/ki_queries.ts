/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetConfig } from '../types';

export const kiQueryGeneration: DatasetConfig['kiQueryGeneration'] = [
  {
    input: {
      scenario_id: 'healthy-baseline',
      stream_name: 'logs',
      stream_description:
        'Bank of Anthos application logs under healthy conditions with normal banking transactions across all microservices',
    },
    output: {
      criteria: [
        {
          id: 'healthy-baseline-queries',
          text: 'Should generate queries for operational monitoring (e.g., transaction throughput, service health, request volume) rather than error-focused detection since this is healthy traffic',
          score: 2,
        },
        {
          id: 'multi-service-coverage',
          text: 'Generated queries should cover multiple services present in the logs (e.g., frontend, ledgerwriter, balancereader, transactionhistory, userservice) rather than a single service only',
          score: 2,
        },
        {
          id: 'error-monitoring',
          text: 'Should generate proactive error detection queries (e.g., connection failures, HTTP errors, service unavailability) even though this is healthy traffic — the model should set up error monitoring based on entity and dependency features',
          score: 2,
          sampling_filters: [
            { match_phrase: { 'body.text': 'Connection refused' } },
            { match_phrase: { 'body.text': 'HTTPConnectionPool' } },
            { match_phrase: { 'body.text': 'Max retries exceeded' } },
          ],
        },
        {
          id: 'stats-aggregate-monitoring',
          text: 'Should generate at least one STATS metric-series query (bucket + metric_value, no post-STATS threshold WHERE) for aggregate monitoring (e.g., transaction throughput per service, request volume across ledgerwriter and loadgenerator). Descriptions should document dataset_analysis baselines, not breach thresholds.',
          score: 1,
        },
        {
          id: 'avoid-routine-success-alerts',
          text: 'Must not generate MATCH queries that alert solely because a verified routine successful operation occurred in this healthy snapshot (verified examples: "Login Successful." 385 docs, "Deposit submitted successfully." 362 docs, "Payment initiated successfully." 291 docs). These are success events, not alert conditions. Useful aggregates over successful operations remain allowed (throughput, success-rate degradation, absence of activity), and a success event used as evidence inside a broader failure condition rather than as the alert condition itself remains allowed. A direct alert on any of these routine-success messages fails this criterion.',
          score: 1,
          sampling_filters: [
            { match_phrase: { 'body.text': 'Login Successful.' } },
            { match_phrase: { 'body.text': 'Deposit submitted successfully.' } },
            { match_phrase: { 'body.text': 'Payment initiated successfully.' } },
          ],
        },
      ],
      expected_categories: ['operational', 'error'],
      expect_stats: true,
      expected_ground_truth:
        'queries=[operational monitoring for service health/traffic/latency across frontend/ledgerwriter/balancereader/userservice/transactionhistory; proactive error detection using body.text patterns (Connection refused, HTTPConnectionPool, Max retries exceeded) grounded in entity and dependency features; STATS metric-series queries for aggregate transaction throughput and request volume monitoring with baselines from dataset_analysis]',
    },
    metadata: {
      difficulty: 'easy',
      failure_domain: 'none',
    },
  },
  {
    input: {
      scenario_id: 'ledger-db-disconnect',
      stream_name: 'logs',
      stream_description:
        'Bank of Anthos logs where the ledger-db PostgreSQL database becomes unreachable, causing frontend, ledgerwriter, balancereader, and transactionhistory to fail',
    },
    output: {
      criteria: [
        {
          id: 'jdbc-error-query',
          text: 'Must generate an ES|QL query that catches JDBC/SQL connection errors (e.g: SQLState: 08001)',
          score: 3,
          sampling_filters: [
            { match_phrase: { 'body.text': 'SQLState: 08001' } },
            { match_phrase: { 'body.text': 'The connection attempt failed' } },
          ],
        },
        {
          id: 'ledger-db-disconnect-impact-query',
          text: 'Should generate a query detecting errors across frontend, ledgerwriter, balancereader, and transactionhistory services',
          score: 2,
          sampling_filters: [
            {
              bool: {
                filter: [
                  { term: { 'resource.attributes.app.keyword': 'frontend' } },
                  { match_phrase: { 'body.text': 'Read timed out' } },
                ],
              },
            },
          ],
        },
        {
          id: 'stats-error-rate-detection',
          text: 'Should generate a STATS query detecting elevated error rates during the ledger-db disconnect (e.g., JDBC connection error frequency spike across ledgerwriter/balancereader/transactionhistory, or cache error rate per service). The STATS query should complement the match-type error detection queries.',
          score: 2,
        },
      ],
      expected_categories: ['error', 'operational'],
      expect_stats: true,
      expect_queries: true,
      expected_ground_truth:
        'queries=[error detection for JDBC/SQL error, cache error, timeout, connection refused or connection attempt, upstream impact in frontend/ledgerwriter/balancereader/transactionhistory; STATS queries for aggregate error rate detection during ledger-db disconnect (JDBC error frequency, cache error rate per service)]',
    },
    metadata: {
      difficulty: 'medium',
      failure_domain: 'ledger-db',
      failure_mode: 'database_disconnect',
    },
    rerun: {
      // Seeds the JDBC signal (verified: SQLState 08001=183 docs, connect-fail=189);
      // the frontend "Read timed out" signal (988 docs) is intentionally unseeded.
      existing_queries: [
        {
          id: 'seed-jdbc-sqlstate',
          title: 'JDBC connection failure',
          type: 'match',
          severity_score: 80,
          description:
            'PostgreSQL connection refused (SQLState: 08001) across ledgerwriter, balancereader, and transactionhistory',
          esql: 'FROM logs | WHERE body.text LIKE "*SQLState: 08001*"',
        },
        {
          id: 'seed-jdbc-connect-attempt',
          title: 'JDBC connection attempt failure',
          type: 'match',
          severity_score: 75,
          description: 'JDBC connection attempt failed messages during ledger-db disconnect',
          esql: 'FROM logs | WHERE body.text LIKE "*The connection attempt failed*"',
        },
      ],
      criteria: [
        {
          id: 'rerun-frontend-timeout-signal',
          text: 'Must generate at least one accepted query detecting the cross-service timeout/impact signal NOT covered by the seeded queries: frontend "Read timed out" errors from ledgerwriter calls (verified: 988 docs in the pinned snapshot; pattern: resource.attributes.app=frontend and body.text containing "Read timed out").',
          score: 3,
          sampling_filters: [
            {
              bool: {
                filter: [
                  { term: { 'resource.attributes.app.keyword': 'frontend' } },
                  { match_phrase: { 'body.text': 'Read timed out' } },
                ],
              },
            },
          ],
        },
        {
          id: 'rerun-semantic-avoidance',
          text: 'Must NOT re-attempt the seeded JDBC detection: no accepted or attempted query may semantically repeat the seeded detection of SQLState: 08001 / "The connection attempt failed" under different wording, aliases, field guesses, or equivalent predicates. The seeded queries already cover this signal; emitting another variant of it fails this criterion.',
          score: 2,
        },
        {
          id: 'rerun-stats-signal',
          text: 'Should generate a useful STATS metric-series query for a signal not already covered by the seeded match queries (e.g., frontend timeout rate per minute), since the seed list contains no aggregation.',
          score: 1,
        },
      ],
    },
  },
];
