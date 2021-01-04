/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchStatus } from './types';
import { getSessionStatus } from './get_session_status';
import { BackgroundSessionStatus } from '../../../common';
import { SearchStatusInfo } from './get_search_status';

describe('getSessionStatus', () => {
  test("returns an in_progress status if there's nothing inside the session", () => {
    const statuses: SearchStatusInfo[] = [];
    expect(getSessionStatus(statuses)).toBe(BackgroundSessionStatus.IN_PROGRESS);
  });

  test("returns an error status if there's at least one error", () => {
    const statuses: SearchStatusInfo[] = [
      { status: SearchStatus.IN_PROGRESS },
      { status: SearchStatus.ERROR, error: 'Nope' },
      { status: SearchStatus.COMPLETE },
    ];
    expect(getSessionStatus(statuses)).toBe(BackgroundSessionStatus.ERROR);
  });

  test('returns a complete status if all are complete', () => {
    const statuses: SearchStatusInfo[] = [
      { status: SearchStatus.COMPLETE },
      { status: SearchStatus.COMPLETE },
      { status: SearchStatus.COMPLETE },
    ];
    expect(getSessionStatus(statuses)).toBe(BackgroundSessionStatus.COMPLETE);
  });

  test('returns a running status if some are still running', () => {
    const statuses: SearchStatusInfo[] = [
      { status: SearchStatus.IN_PROGRESS },
      { status: SearchStatus.COMPLETE },
      { status: SearchStatus.COMPLETE },
    ];
    expect(getSessionStatus(statuses)).toBe(BackgroundSessionStatus.IN_PROGRESS);
  });
});
