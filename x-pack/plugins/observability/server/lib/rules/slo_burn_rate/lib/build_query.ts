/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';
import { Duration, SLO, toMomentUnitOfTime } from '../../../../domain/models';
import { WindowSchema } from '../types';

export type BurnRateWindowWithDuration = WindowSchema & {
  longDuration: Duration;
  shortDuration: Duration;
};

export interface EvaluationAfterKey {
  instanceId: string;
}

export const LONG_WINDOW = 'LONG';
export const SHORT_WINDOW = 'SHORT';
const BURN_RATE = 'BURN_RATE';
const WINDOW = 'WINDOW';
const ABOVE_THRESHOLD = 'ABOVE_THRESHOLD';
type WindowType = typeof LONG_WINDOW | typeof SHORT_WINDOW;

export function generateWindowId(index: string | number) {
  return `${WINDOW}_${index}`;
}

export function generateStatsKey(id: string, type: WindowType) {
  return `${id}_${type}`;
}

export function generateBurnRateKey(id: string, type: WindowType) {
  return `${generateStatsKey(id, type)}_${BURN_RATE}`;
}

export function generateAboveThresholdKey(id: string, type: WindowType) {
  return `${generateStatsKey(id, type)}_${ABOVE_THRESHOLD}`;
}

const TIMESLICE_AGGS = {
  good: { sum: { field: 'slo.isGoodSlice' } },
  total: { value_count: { field: 'slo.isGoodSlice' } },
};
const OCCURRENCE_AGGS = {
  good: { sum: { field: 'slo.numerator' } },
  total: { sum: { field: 'slo.denominator' } },
};

function buildWindowAgg(
  id: string,
  type: WindowType,
  threshold: number,
  slo: SLO,
  dateRange: { from: Date; to: Date }
) {
  const aggs = timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)
    ? TIMESLICE_AGGS
    : OCCURRENCE_AGGS;

  return {
    [`${id}_${type}`]: {
      filter: {
        range: {
          '@timestamp': {
            gte: dateRange.from.toISOString(),
            lt: dateRange.to.toISOString(),
          },
        },
      },
      aggs,
    },
    [generateBurnRateKey(id, type)]: {
      bucket_script: {
        buckets_path: {
          good: `${id}_${type}>good`,
          total: `${id}_${type}>total`,
        },
        script: {
          source:
            'params.total != null && params.total > 0 ? (1 - (params.good / params.total)) / (1 - params.target) : 0',
          params: { target: slo.objective.target },
        },
      },
    },
    [generateAboveThresholdKey(id, type)]: {
      bucket_script: {
        buckets_path: { burnRate: generateBurnRateKey(id, type) },
        script: {
          source: 'params.burnRate >= params.threshold ? 1 : 0',
          params: { threshold },
        },
      },
    },
  };
}

function buildWindowAggs(
  startedAt: string,
  slo: SLO,
  burnRateWindows: BurnRateWindowWithDuration[]
) {
  return burnRateWindows.reduce((acc, winDef, index) => {
    const shortDateRange = getLookbackDateRange(startedAt, winDef.shortDuration);
    const longDateRange = getLookbackDateRange(startedAt, winDef.longDuration);
    const windowId = generateWindowId(index);
    return {
      ...acc,
      ...buildWindowAgg(windowId, SHORT_WINDOW, winDef.burnRateThreshold, slo, shortDateRange),
      ...buildWindowAgg(windowId, LONG_WINDOW, winDef.burnRateThreshold, slo, longDateRange),
    };
  }, {});
}

function buildEvaluation(burnRateWindows: BurnRateWindowWithDuration[]) {
  const bucketsPath = burnRateWindows.reduce((acc, _winDef, index) => {
    const windowId = `${WINDOW}_${index}`;
    return {
      ...acc,
      [generateAboveThresholdKey(windowId, SHORT_WINDOW)]: generateAboveThresholdKey(
        windowId,
        SHORT_WINDOW
      ),
      [generateAboveThresholdKey(windowId, LONG_WINDOW)]: generateAboveThresholdKey(
        windowId,
        LONG_WINDOW
      ),
    };
  }, {});

  const source = burnRateWindows.reduce((acc, _windDef, index) => {
    const windowId = `${WINDOW}_${index}`;
    const OP = acc ? ' || ' : '';
    return `${acc}${OP}(params.${generateAboveThresholdKey(
      windowId,
      SHORT_WINDOW
    )} == 1 && params.${generateAboveThresholdKey(windowId, LONG_WINDOW)} == 1)`;
  }, '');

  return {
    evaluation: {
      bucket_selector: {
        buckets_path: bucketsPath,
        script: {
          source,
        },
      },
    },
  };
}

export function buildQuery(
  slo: SLO,
  dateStart: string,
  dateEnd: string,
  burnRateWindows: BurnRateWindowWithDuration[],
  afterKey?: EvaluationAfterKey
) {
  return {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { 'slo.id': slo.id } },
          { term: { 'slo.revision': slo.revision } },
          {
            range: {
              '@timestamp': {
                gte: dateStart,
                lt: dateEnd,
              },
            },
          },
        ],
      },
    },
    aggs: {
      instances: {
        composite: {
          ...(afterKey ? { after: afterKey } : {}),
          size: 1000,
          sources: [{ instanceId: { terms: { field: 'slo.instanceId' } } }],
        },
        aggs: {
          ...buildWindowAggs(dateEnd, slo, burnRateWindows),
          ...buildEvaluation(burnRateWindows),
        },
      },
    },
  };
}

function getLookbackDateRange(startedAt: string, duration: Duration): { from: Date; to: Date } {
  const unit = toMomentUnitOfTime(duration.unit);
  const now = moment(startedAt);
  const from = now.clone().subtract(duration.value, unit);
  const to = now.clone();

  return {
    from: from.toDate(),
    to: to.toDate(),
  };
}
