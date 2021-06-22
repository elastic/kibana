/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const getIntervalOptions = (bucketSpan: string) => {
  const unitMatch = bucketSpan.match(/[d | h| m | s]/g)!;
  const unit = unitMatch[0];
  const count = Number(bucketSpan.replace(/[^0-9]/g, ''));

  const intervalOptions = [];

  if (['s', 'ms', 'micros', 'nanos'].includes(unit)) {
    intervalOptions.push(
      {
        value: '1 hour',
        text: i18n.translate('xpack.ml.jobsList.datafeedModal.1hourOption', {
          defaultMessage: '{count} hour',
          values: { count: 1 },
        }),
      },
      {
        value: '2 hours',
        text: i18n.translate('xpack.ml.jobsList.datafeedModal.2hourOption', {
          defaultMessage: '{count} hours',
          values: { count: 2 },
        }),
      }
    );
  }

  if ((unit === 'm' && count <= 4) || unit === 'h') {
    intervalOptions.push(
      {
        value: '3 hours',
        text: i18n.translate('xpack.ml.jobsList.datafeedModal.3hourOption', {
          defaultMessage: '{count} hours',
          values: { count: 3 },
        }),
      },
      {
        value: '8 hours',
        text: i18n.translate('xpack.ml.jobsList.datafeedModal.8hourOption', {
          defaultMessage: '{count} hours',
          values: { count: 8 },
        }),
      },
      {
        value: '12 hours',
        text: i18n.translate('xpack.ml.jobsList.datafeedModal.12hourOption', {
          defaultMessage: '{count} hours',
          values: { count: 12 },
        }),
      },
      {
        value: '24 hours',
        text: i18n.translate('xpack.ml.jobsList.datafeedModal.24hourOption', {
          defaultMessage: '{count} hours',
          values: { count: 24 },
        }),
      }
    );
  }

  if ((unit === 'm' && count >= 5 && count <= 15) || unit === 'h') {
    intervalOptions.push(
      {
        value: '48 hours',
        text: i18n.translate('xpack.ml.jobsList.datafeedModal.48hourOption', {
          defaultMessage: '{count} hours',
          values: { count: 48 },
        }),
      },
      {
        value: '72 hours',
        text: i18n.translate('xpack.ml.jobsList.datafeedModal.72hourOption', {
          defaultMessage: '{count} hours',
          values: { count: 72 },
        }),
      }
    );
  }

  if ((unit === 'm' && count >= 10 && count <= 15) || unit === 'h' || unit === 'd') {
    intervalOptions.push(
      {
        value: '5 days',
        text: i18n.translate('xpack.ml.jobsList.datafeedModal.5daysOption', {
          defaultMessage: '{count} days',
          values: { count: 5 },
        }),
      },
      {
        value: '7 days',
        text: i18n.translate('xpack.ml.jobsList.datafeedModal.7daysOption', {
          defaultMessage: '{count} days',
          values: { count: 7 },
        }),
      }
    );
  }

  if (unit === 'h' || unit === 'd') {
    intervalOptions.push({
      value: '14 days',
      text: i18n.translate('xpack.ml.jobsList.datafeedModal.14DaysOption', {
        defaultMessage: '{count} days',
        values: { count: 14 },
      }),
    });
  }

  return intervalOptions;
};
