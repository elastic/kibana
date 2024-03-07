/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { I18LABELS } from '../translations';

export const DATA_UNDEFINED_LABEL = i18n.translate(
  'xpack.ux.coreVitals.dataUndefined',
  {
    defaultMessage: 'N/A',
  }
);

export const FCP_LABEL = i18n.translate('xpack.ux.coreVitals.fcp', {
  defaultMessage: 'First contentful paint',
});

export const FCP_TOOLTIP = i18n.translate('xpack.ux.coreVitals.fcpTooltip', {
  defaultMessage:
    'First contentful paint (FCP) focusses on the initial rendering and measures the time from when the page starts loading to when any part of the page’s content is displayed on the screen.',
});

export const TBT_LABEL = i18n.translate('xpack.ux.coreVitals.tbt', {
  defaultMessage: 'Total blocking time',
});

export const TBT_TOOLTIP = i18n.translate('xpack.ux.coreVitals.tbtTooltip', {
  defaultMessage:
    'Total blocking time (TBT) is the sum of the blocking time (duration above 50 ms) for each long task that occurs between the First contentful paint and the time when the transaction is completed.',
});

export const NO_OF_LONG_TASK = i18n.translate(
  'xpack.ux.uxMetrics.noOfLongTasks',
  {
    defaultMessage: 'No. of long tasks',
  }
);

export const NO_OF_LONG_TASK_TOOLTIP = i18n.translate(
  'xpack.ux.uxMetrics.noOfLongTasksTooltip',
  {
    defaultMessage:
      'The number of long tasks, a long task is defined as any user activity or browser task that monopolizes the UI thread for extended periods (greater than 50 milliseconds) and blocks other critical tasks (frame rate or input latency) from being executed.',
  }
);

export const LONGEST_LONG_TASK = i18n.translate(
  'xpack.ux.uxMetrics.longestLongTasks',
  {
    defaultMessage: 'Longest long task duration',
  }
);

export const LONGEST_LONG_TASK_TOOLTIP = i18n.translate(
  'xpack.ux.uxMetrics.longestLongTasksTooltip',
  {
    defaultMessage:
      'The duration of the longest long task, a long task is defined as any user activity or browser task that monopolizes the UI thread for extended periods (greater than 50 milliseconds) and blocks other critical tasks (frame rate or input latency) from being executed.',
  }
);

export const SUM_LONG_TASKS = i18n.translate(
  'xpack.ux.uxMetrics.sumLongTasks',
  {
    defaultMessage: 'Total long tasks duration',
  }
);

export const SUM_LONG_TASKS_TOOLTIP = i18n.translate(
  'xpack.ux.uxMetrics.sumLongTasksTooltip',
  {
    defaultMessage:
      'The total duration of long tasks, a long task is defined as any user activity or browser task that monopolizes the UI thread for extended periods (greater than 50 milliseconds) and blocks other critical tasks (frame rate or input latency) from being executed.',
  }
);

export const getPercentileLabel = (value: number) => {
  if (value === 50) return I18LABELS.median;

  return i18n.translate('xpack.ux.percentiles.label', {
    defaultMessage: '{value}th Perc.',
    values: {
      value,
    },
  });
};
