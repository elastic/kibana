/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { SLO } from '../../domain/models';
import { generateSummaryTransformForOccurrences } from './generators/occurrences';
import { generateSummaryTransformForTimeslicesAndRolling } from './generators/timeslices_rolling';
import { generateSummaryTransformForTimeslicesAndCalendarAligned } from './generators/timeslices_calendar_aligned';

export interface SummaryTransformGenerator {
  generate(slo: SLO): TransformPutTransformRequest;
}

export class DefaultSummaryTransformGenerator implements SummaryTransformGenerator {
  public generate(slo: SLO): TransformPutTransformRequest {
    if (slo.budgetingMethod === 'occurrences') {
      return generateSummaryTransformForOccurrences(slo);
    } else if (slo.budgetingMethod === 'timeslices' && slo.timeWindow.type === 'rolling') {
      return generateSummaryTransformForTimeslicesAndRolling(slo);
    } else if (slo.budgetingMethod === 'timeslices' && slo.timeWindow.type === 'calendarAligned') {
      return generateSummaryTransformForTimeslicesAndCalendarAligned(slo);
    }

    throw new Error('Not supported SLO');
  }
}
