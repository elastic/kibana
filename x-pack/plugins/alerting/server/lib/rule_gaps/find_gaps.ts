/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogClient } from '@kbn/event-log-plugin/server';
import { Logger } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { Gap, FindGapsParams } from './types';
import { transformToGap } from './transforms/transformToGap';

export const findGaps = async ({
  eventLogClient,
  logger,
  params,
}: {
  eventLogClient: IEventLogClient;
  logger: Logger;
  params: FindGapsParams;
}): Promise<{
  total: number;
  data: Gap[];
  page: number;
  perPage: number;
}> => {
  const { ruleIds, start, end, page, perPage } = params;
  try {
    const gapsResponse = await eventLogClient.findEventsBySavedObjectIds(
      RULE_SAVED_OBJECT_TYPE,
      ruleIds,
      {
        filter: `event.action: gap AND event.provider: alerting and (kibana.alert.rule.gap.range <= "${end}" AND kibana.alert.rule.gap.range >= "${start}")`,
        sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
        page,
        per_page: perPage,
      }
    );

    return {
      total: gapsResponse.total,
      data: transformToGap(gapsResponse),
      page: gapsResponse.page,
      perPage: gapsResponse.per_page,
    };
  } catch (err) {
    logger.error(`Failed to find gaps for rule ${ruleIds.toString()}: ${err.message}`);
    throw err;
  }
};

export const findAllGaps = async ({
  eventLogClient,
  logger,
  params,
}: {
  eventLogClient: IEventLogClient;
  logger: Logger;
  params: {
    ruleIds: string[];
    start: Date;
    end: Date;
  };
}): Promise<Gap[]> => {
  const { ruleIds, start, end } = params;
  const allGaps: Gap[] = [];
  let currentPage = 1;
  const perPage = 10000;

  while (true) {
    const { data } = await findGaps({
      eventLogClient,
      logger,
      params: {
        ruleIds,
        start: start.toISOString(),
        end: end.toISOString(),
        page: currentPage,
        perPage,
      },
    });

    allGaps.push(...data);

    if (data.length === 0 || data.length < perPage) {
      break;
    }

    currentPage++;
  }

  return allGaps;
};
