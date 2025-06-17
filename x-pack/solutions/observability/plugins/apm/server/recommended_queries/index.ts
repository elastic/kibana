/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const RECOMMENDED_QUERIES = [
  {
    name: i18n.translate('xpack.apm.recommendedQueries.findRootTraces.name', {
      defaultMessage: 'Find root traces',
    }),
    query: 'FROM traces-* | WHERE parent.id IS NULL OR parent_span_id IS NULL',
    description: i18n.translate('xpack.apm.recommendedQueries.findRootTraces.description', {
      defaultMessage:
        'Display all root spans, which represent the start of a request or transaction. This is useful for getting a high-level overview of all operations in your system.',
    }),
  },
  {
    name: i18n.translate('xpack.apm.recommendedQueries.slowDatabaseQueries.name', {
      defaultMessage: 'Slow database queries',
    }),
    query:
      'FROM traces-* | WHERE (span.type == "db" OR db.system.name IS NOT NULL) AND (span.duration.us > 100000 OR duration > 100000000)',
    description: i18n.translate('xpack.apm.recommendedQueries.slowDatabaseQueries.description', {
      defaultMessage:
        'Pinpoint performance bottlenecks by finding all database (db) spans that took longer than 100ms to execute.',
    }),
  },
  {
    name: i18n.translate('xpack.apm.recommendedQueries.allApplicationErrors.name', {
      defaultMessage: 'All application errors',
    }),
    query: 'FROM logs-* | WHERE processor.event == "error" OR event_name == "exception"',
    description: i18n.translate('xpack.apm.recommendedQueries.allApplicationErrors.description', {
      defaultMessage:
        'Scan logs to find all documents marked as an error or exception, which is essential for monitoring and troubleshooting application failures.',
    }),
  },
  {
    name: i18n.translate('xpack.apm.recommendedQueries.top100SlowestTransactions.name', {
      defaultMessage: 'Top 100 slowest transactions',
    }),
    query:
      'FROM traces-* | WHERE transaction.duration.us > 1000 OR duration > 100000 | SORT transaction.duration.us DESC, duration DESC | LIMIT 100',
    description: i18n.translate(
      'xpack.apm.recommendedQueries.top100SlowestTransactions.description',
      {
        defaultMessage:
          'Identify the 100 slowest transactions that took longer than 1ms. The results are sorted from slowest to fastest to help prioritize optimization.',
      }
    ),
  },
  {
    name: i18n.translate('xpack.apm.recommendedQueries.slowOrFailedRootSpans.name', {
      defaultMessage: 'Slow or failed root spans',
    }),
    query:
      'FROM traces-* | WHERE (parent.id IS NULL OR parent_span_id IS NULL) AND (transaction.duration.us > 100000 OR duration > 10000000 OR event.outcome == "failure" OR status.code == "Error")',
    description: i18n.translate('xpack.apm.recommendedQueries.slowOrFailedRootSpans.description', {
      defaultMessage:
        'Find root traces that were either slow (over 100ms) or failed. This is key to identifying poor user experiences and critical errors.',
    }),
  },
  {
    name: i18n.translate('xpack.apm.recommendedQueries.matchingUrlPattern.name', {
      defaultMessage: 'Find spans matching URL pattern',
    }),
    query: 'FROM traces-* | WHERE QSTR("""url.path: \\/api\\/*""")',
    description: i18n.translate('xpack.apm.recommendedQueries.matchingUrlPattern.description', {
      defaultMessage:
        'Find all spans which have url.path attribute matching a specified condition.',
    }),
  },
];
