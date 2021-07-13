/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchSessionsConfig, SearchStatus } from './types';
import { getSessionStatus } from './get_session_status';
import { SearchSessionStatus } from '../../../../../../src/plugins/data/common';
import moment from 'moment';

describe('getSessionStatus', () => {
  const mockConfig = ({
    notTouchedInProgressTimeout: moment.duration(1, 'm'),
  } as unknown) as SearchSessionsConfig;
  test("returns an in_progress status if there's nothing inside the session", () => {
    const session: any = {
      idMapping: {},
      touched: moment(),
    };
    expect(getSessionStatus(session, mockConfig)).toBe(SearchSessionStatus.IN_PROGRESS);
  });

  test("returns an error status if there's at least one error", () => {
    const session: any = {
      idMapping: {
        a: { status: SearchStatus.IN_PROGRESS },
        b: { status: SearchStatus.ERROR, error: 'Nope' },
        c: { status: SearchStatus.COMPLETE },
      },
    };
    expect(getSessionStatus(session, mockConfig)).toBe(SearchSessionStatus.ERROR);
  });

  test('expires a empty session after a minute', () => {
    const session: any = {
      idMapping: {},
      touched: moment().subtract(2, 'm'),
    };
    expect(getSessionStatus(session, mockConfig)).toBe(SearchSessionStatus.EXPIRED);
  });

  test('doesnt expire a full session after a minute', () => {
    const session: any = {
      idMapping: {
        a: { status: SearchStatus.IN_PROGRESS },
      },
      touched: moment().subtract(2, 'm'),
    };
    expect(getSessionStatus(session, mockConfig)).toBe(SearchSessionStatus.IN_PROGRESS);
  });

  test('returns a complete status if all are complete', () => {
    const session: any = {
      idMapping: {
        a: { status: SearchStatus.COMPLETE },
        b: { status: SearchStatus.COMPLETE },
        c: { status: SearchStatus.COMPLETE },
      },
    };
    expect(getSessionStatus(session, mockConfig)).toBe(SearchSessionStatus.COMPLETE);
  });

  test('returns a running status if some are still running', () => {
    const session: any = {
      idMapping: {
        a: { status: SearchStatus.IN_PROGRESS },
        b: { status: SearchStatus.COMPLETE },
        c: { status: SearchStatus.IN_PROGRESS },
      },
    };
    expect(getSessionStatus(session, mockConfig)).toBe(SearchSessionStatus.IN_PROGRESS);
  });
});
