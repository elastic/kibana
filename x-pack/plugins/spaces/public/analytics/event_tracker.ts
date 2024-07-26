/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';

import type { SolutionView } from '../../common';

export enum EventType {
  SPACE_SOLUTION_CHANGED = 'space_solution_changed',
}

export enum FieldType {
  SPACE_ID = 'space_id',
  ACTION = 'action',
  SOLUTION_PREV = 'solution_prev',
  SOLUTION_NEXT = 'solution_next',
}

export class EventTracker {
  constructor(private analytics: Pick<AnalyticsServiceStart, 'reportEvent'>) {}

  private track(eventType: string, eventFields: object) {
    try {
      this.analytics.reportEvent(eventType, eventFields);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  /**
   * Track whenever the space "solution" is changed.
   */
  public spaceSolutionChanged({
    spaceId,
    action,
    solution,
    solutionPrev,
  }: {
    spaceId: string;
    action: 'create' | 'edit';
    solution: SolutionView;
    solutionPrev?: SolutionView;
  }) {
    this.track(EventType.SPACE_SOLUTION_CHANGED, {
      [FieldType.SPACE_ID]: spaceId,
      [FieldType.SOLUTION_NEXT]: solution,
      [FieldType.SOLUTION_PREV]: solutionPrev,
      [FieldType.ACTION]: action,
    });
  }
}
