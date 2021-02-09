/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import { selectTimeline } from '../../../../store/timeline/selectors';

export const getEqlOptions = () =>
  createSelector(
    selectTimeline,
    (timeline) =>
      timeline?.eqlOptions ?? {
        eventCategoryField: [{ label: 'event.category' }],
        tiebreakerField: [
          {
            label: 'event.sequence',
          },
        ],
        timestampField: [
          {
            label: '@timestamp',
          },
        ],
      }
  );
