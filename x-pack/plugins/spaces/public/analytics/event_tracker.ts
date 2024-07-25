/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';

import type { SolutionView } from '../../common';

export enum EventType {
  SPACE_CREATED = 'space_created',
  SPACE_EDITED = 'space_edited',
}

export enum FieldType {
  SPACE_ID = 'space_id',
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

  /*
   * Track whenever a user creates a new space
   */
  public spaceCreated({ spaceId, solution }: { spaceId: string; solution?: SolutionView }) {
    this.track(EventType.SPACE_CREATED, {
      [FieldType.SPACE_ID]: spaceId,
      [FieldType.SOLUTION_NEXT]: solution,
    });
  }

  /**
   * Track whenever a user edits a space
   */
  public spaceEdited({
    spaceId,
    solution,
    solutionPrev,
  }: {
    spaceId: string;
    solution?: SolutionView;
    solutionPrev?: SolutionView;
  }) {
    this.track(EventType.SPACE_EDITED, {
      [FieldType.SPACE_ID]: spaceId,
      [FieldType.SOLUTION_NEXT]: solution,
      [FieldType.SOLUTION_PREV]: solutionPrev,
    });
  }
}
