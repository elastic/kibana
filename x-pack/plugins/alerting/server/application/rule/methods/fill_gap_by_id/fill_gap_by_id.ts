/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { RulesClientContext } from '../../../../rules_client';

import { findGapById as _findGapById } from '../../../../lib/rule_gaps/find_gap_by_id';
import { FindGapByIdParams } from '../../../../lib/rule_gaps/types';
import { scheduleBackfill } from '../../../backfill/methods/schedule';

export async function fillGapById(context: RulesClientContext, params: FindGapByIdParams) {
  try {
    const eventLogClient = await context.getEventLogClient();
    const gap = await _findGapById({
      params,
      eventLogClient,
      logger: context.logger,
    });

    if (!gap) {
      throw Boom.notFound(`Gap not found for ruleId ${params.ruleId} and gapId ${params.gapId}`);
    }

    const gapState = gap.getState();

    const allGapsScheduled =
      gapState.unfilledIntervals.map((interval) => ({
        ruleId: params.ruleId,
        start: interval.gte,
        end: interval.lte,
      })) ?? [];

    return scheduleBackfill(context, allGapsScheduled);
  } catch (err) {
    const errorMessage = `Failed to find gap and schedule manual rule run`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
