/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchStatus } from './types';
import { getSessionStatus } from './get_session_status';
import { SearchSessionStatus } from '../../../common';

describe('getSessionStatus', () => {
  test("returns an in_progress status if there's nothing inside the session", () => {
    const session: any = {
      idMapping: {},
    };
    expect(getSessionStatus(session)).toBe(SearchSessionStatus.IN_PROGRESS);
  });

  test("returns an error status if there's at least one error", () => {
    const session: any = {
      idMapping: {
        a: { status: SearchStatus.IN_PROGRESS },
        b: { status: SearchStatus.ERROR, error: 'Nope' },
        c: { status: SearchStatus.COMPLETE },
      },
    };
    expect(getSessionStatus(session)).toBe(SearchSessionStatus.ERROR);
  });

  test('returns a complete status if all are complete', () => {
    const session: any = {
      idMapping: {
        a: { status: SearchStatus.COMPLETE },
        b: { status: SearchStatus.COMPLETE },
        c: { status: SearchStatus.COMPLETE },
      },
    };
    expect(getSessionStatus(session)).toBe(SearchSessionStatus.COMPLETE);
  });

  test('returns a running status if some are still running', () => {
    const session: any = {
      idMapping: {
        a: { status: SearchStatus.IN_PROGRESS },
        b: { status: SearchStatus.COMPLETE },
        c: { status: SearchStatus.IN_PROGRESS },
      },
    };
    expect(getSessionStatus(session)).toBe(SearchSessionStatus.IN_PROGRESS);
  });
});
