/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchStatus } from './types';
import { getSessionStatus } from './get_session_status';
import { BackgroundSessionStatus } from '../../../common';

describe('getSessionStatus', () => {
  test("returns an in_progress status if there's nothing inside the session", () => {
    const statuses: SearchStatus[] = [];
    expect(getSessionStatus(statuses)).toBe(BackgroundSessionStatus.IN_PROGRESS);
  });

  test("returns an error status if there's at least one error", () => {
    const statuses: SearchStatus[] = [
      SearchStatus.IN_PROGRESS,
      SearchStatus.ERROR,
      SearchStatus.COMPLETE,
    ];
    expect(getSessionStatus(statuses)).toBe(BackgroundSessionStatus.ERROR);
  });

  test('returns a complete status if all are complete', () => {
    const statuses: SearchStatus[] = [
      SearchStatus.COMPLETE,
      SearchStatus.COMPLETE,
      SearchStatus.COMPLETE,
    ];
    expect(getSessionStatus(statuses)).toBe(BackgroundSessionStatus.COMPLETE);
  });

  test('returns a running status if some are still running', () => {
    const statuses: SearchStatus[] = [
      SearchStatus.IN_PROGRESS,
      SearchStatus.COMPLETE,
      SearchStatus.COMPLETE,
    ];
    expect(getSessionStatus(statuses)).toBe(BackgroundSessionStatus.IN_PROGRESS);
  });
});
