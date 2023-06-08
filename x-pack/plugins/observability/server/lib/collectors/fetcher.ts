/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import { StoredSLO } from '../../domain/models';
import { SO_SLO_TYPE } from '../../saved_objects';
import { Usage } from './type';

export const fetcher = async (context: CollectorFetchContext) => {
  const finder = context.soClient.createPointInTimeFinder<StoredSLO>({
    type: SO_SLO_TYPE,
    perPage: 100,
  });

  let usage: Usage['slo'] = {
    total: 0,
    by_status: {
      enabled: 0,
      disabled: 0,
    },
    by_sli_type: {},
    by_rolling_duration: {},
    by_calendar_aligned_duration: {},
    by_budgeting_method: {
      occurrences: 0,
      timeslices: 0,
    },
  };

  for await (const response of finder.find()) {
    usage = response.saved_objects.reduce((acc, so) => {
      return {
        ...acc,
        total: acc.total + 1,
        by_status: {
          ...acc.by_status,
          ...(so.attributes.enabled && { enabled: acc.by_status.enabled + 1 }),
          ...(!so.attributes.enabled && { disabled: acc.by_status.disabled + 1 }),
        },
        by_sli_type: {
          ...acc.by_sli_type,
          [so.attributes.indicator.type]: (acc.by_sli_type[so.attributes.indicator.type] ?? 0) + 1,
        },
        by_rolling_duration: {
          ...acc.by_rolling_duration,
          ...('isRolling' in so.attributes.timeWindow && {
            [so.attributes.timeWindow.duration]:
              (acc.by_rolling_duration[so.attributes.timeWindow.duration] ?? 0) + 1,
          }),
        },
        by_calendar_aligned_duration: {
          ...acc.by_calendar_aligned_duration,
          ...('isCalendar' in so.attributes.timeWindow && {
            [so.attributes.timeWindow.duration]:
              (acc.by_calendar_aligned_duration[so.attributes.timeWindow.duration] ?? 0) + 1,
          }),
        },
        by_budgeting_method: {
          ...acc.by_budgeting_method,
          ...(so.attributes.budgetingMethod === 'occurrences' && {
            occurrences: acc.by_budgeting_method.occurrences + 1,
          }),
          ...(so.attributes.budgetingMethod === 'timeslices' && {
            timeslices: acc.by_budgeting_method.timeslices + 1,
          }),
        },
      };
    }, usage);
  }

  await finder.close();

  return {
    slo: usage,
  };
};
