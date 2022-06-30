/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OUTPUT_MESSAGES = Object.freeze({
  hasExpired: (command: string) =>
    i18n.translate('xpack.securitySolution.responseActionsList.list.item.hasExpired', {
      defaultMessage: `{command} failed: action expired`,
      values: { command },
    }),
  wasSuccessful: (command: string) =>
    i18n.translate('xpack.securitySolution.responseActionsList.list.item.wasSuccessful', {
      defaultMessage: `{command} completed successfully`,
      values: { command },
    }),
  isPending: (command: string) =>
    i18n.translate('xpack.securitySolution.responseActionsList.list.item.isPending', {
      defaultMessage: `{command} is pending`,
      values: { command },
    }),
  hasFailed: (command: string) =>
    i18n.translate('xpack.securitySolution.responseActionsList.list.item.hasFailed', {
      defaultMessage: `{command} failed`,
      values: { command },
    }),
  expandSection: {
    placedAt: i18n.translate(
      'xpack.securitySolution.responseActionsList.list.item.expandSection.placedAt',
      {
        defaultMessage: 'Command placed',
      }
    ),
    input: i18n.translate(
      'xpack.securitySolution.responseActionsList.list.item.expandSection.input',
      {
        defaultMessage: 'Input',
      }
    ),
    output: i18n.translate(
      'xpack.securitySolution.responseActionsList.list.item.expandSection.output',
      {
        defaultMessage: 'Output',
      }
    ),
    startedAt: i18n.translate(
      'xpack.securitySolution.responseActionsList.list.item.expandSection.startedAt',
      {
        defaultMessage: 'Execution started on',
      }
    ),
    parameters: i18n.translate(
      'xpack.securitySolution.responseActionsList.list.item.expandSection.parameters',
      {
        defaultMessage: 'Parameters',
      }
    ),
    completedAt: i18n.translate(
      'xpack.securitySolution.responseActionsList.list.item.expandSection.completedAt',
      {
        defaultMessage: 'Execution completed',
      }
    ),
  },
});

export const TABLE_COLUMN_NAMES = Object.freeze({
  time: i18n.translate('xpack.securitySolution.responseActionsList.list.time', {
    defaultMessage: 'Time',
  }),
  command: i18n.translate('xpack.securitySolution.responseActionsList.list.command', {
    defaultMessage: 'Command/action',
  }),
  user: i18n.translate('xpack.securitySolution.responseActionsList.list.user', {
    defaultMessage: 'User',
  }),
  host: i18n.translate('xpack.securitySolution.responseActionsList.list.host', {
    defaultMessage: 'Host',
  }),
  comments: i18n.translate('xpack.securitySolution.responseActionsList.list.comments', {
    defaultMessage: 'Comments',
  }),
  status: i18n.translate('xpack.securitySolution.responseActionsList.list.status', {
    defaultMessage: 'Status',
  }),
});

export const UX_MESSAGES = Object.freeze({
  flyoutTitle: (hostname: string) =>
    i18n.translate('xpack.securitySolution.responseActionsList.flyout.title', {
      defaultMessage: `Action log : {hostname}`,
      values: { hostname },
    }),
  pageTitle: i18n.translate('xpack.securitySolution.responseActionsList.list.title', {
    defaultMessage: 'Response actions',
  }),
  fetchError: i18n.translate('xpack.securitySolution.responseActionsList.list.errorMessage', {
    defaultMessage: 'Error while retrieving response actions',
  }),
  badge: {
    completed: i18n.translate(
      'xpack.securitySolution.responseActionsList.list.item.badge.completed',
      {
        defaultMessage: 'Completed',
      }
    ),
    failed: i18n.translate('xpack.securitySolution.responseActionsList.list.item.badge.failed', {
      defaultMessage: 'Failed',
    }),
    pending: i18n.translate('xpack.securitySolution.responseActionsList.list.item.badge.pending', {
      defaultMessage: 'Pending',
    }),
  },
  screenReaderExpand: i18n.translate(
    'xpack.securitySolution.responseActionsList.list.screenReader.expand',
    {
      defaultMessage: 'Expand rows',
    }
  ),
  recordsLabel: (totalItemCount: number) =>
    i18n.translate('xpack.securitySolution.responseActionsList.list.recordRangeLabel', {
      defaultMessage: '{records, plural, one {response action} other {response actions}}',
      values: {
        records: totalItemCount,
      },
    }),
});
