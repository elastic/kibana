/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { createInitialLogPositionState, updateStateFromUrlState } from './log_position_state';

describe('function createInitialLogPositionState', () => {
  it('initializes state without url and timefilter', () => {
    const initialState = createInitialLogPositionState({
      initialStateFromUrl: null,
      initialStateFromTimefilter: null,
      now: getTestMoment().toDate(),
    });

    expect(initialState).toMatchInlineSnapshot(`
      Object {
        "latestPosition": null,
        "refreshInterval": Object {
          "pause": true,
          "value": 5000,
        },
        "targetPosition": null,
        "timeRange": Object {
          "expression": Object {
            "from": "now-1d",
            "to": "now",
          },
          "lastChangedCompletely": 1640995200000,
        },
        "timestamps": Object {
          "endTimestamp": 1640995200000,
          "lastChangedTimestamp": 1640995200000,
          "startTimestamp": 1640908800000,
        },
        "visiblePositions": Object {
          "endKey": null,
          "middleKey": null,
          "pagesAfterEnd": Infinity,
          "pagesBeforeStart": Infinity,
          "startKey": null,
        },
      }
    `);
  });

  it('initializes state from complete url state', () => {
    const initialState = createInitialLogPositionState({
      initialStateFromUrl: {
        start: 'now-2d',
        end: 'now-1d',
        position: {
          time: getTestMoment().subtract(36, 'hours').valueOf(),
          tiebreaker: 0,
        },
        streamLive: false,
      },
      initialStateFromTimefilter: null,
      now: getTestMoment().toDate(),
    });

    expect(initialState).toMatchInlineSnapshot(`
      Object {
        "latestPosition": Object {
          "tiebreaker": 0,
          "time": 1640865600000,
        },
        "refreshInterval": Object {
          "pause": true,
          "value": 5000,
        },
        "targetPosition": Object {
          "tiebreaker": 0,
          "time": 1640865600000,
        },
        "timeRange": Object {
          "expression": Object {
            "from": "now-2d",
            "to": "now-1d",
          },
          "lastChangedCompletely": 1640995200000,
        },
        "timestamps": Object {
          "endTimestamp": 1640908800000,
          "lastChangedTimestamp": 1640995200000,
          "startTimestamp": 1640822400000,
        },
        "visiblePositions": Object {
          "endKey": null,
          "middleKey": null,
          "pagesAfterEnd": Infinity,
          "pagesBeforeStart": Infinity,
          "startKey": null,
        },
      }
    `);
  });

  it('initializes state from from url state with just a time range', () => {
    const initialState = createInitialLogPositionState({
      initialStateFromUrl: {
        start: 'now-2d',
        end: 'now-1d',
      },
      initialStateFromTimefilter: null,
      now: getTestMoment().toDate(),
    });

    expect(initialState).toMatchInlineSnapshot(`
      Object {
        "latestPosition": null,
        "refreshInterval": Object {
          "pause": true,
          "value": 5000,
        },
        "targetPosition": null,
        "timeRange": Object {
          "expression": Object {
            "from": "now-2d",
            "to": "now-1d",
          },
          "lastChangedCompletely": 1640995200000,
        },
        "timestamps": Object {
          "endTimestamp": 1640908800000,
          "lastChangedTimestamp": 1640995200000,
          "startTimestamp": 1640822400000,
        },
        "visiblePositions": Object {
          "endKey": null,
          "middleKey": null,
          "pagesAfterEnd": Infinity,
          "pagesBeforeStart": Infinity,
          "startKey": null,
        },
      }
    `);
  });

  it('initializes state from from url state with just a position', () => {
    const initialState = createInitialLogPositionState({
      initialStateFromUrl: {
        position: {
          time: getTestMoment().subtract(36, 'hours').valueOf(),
        },
      },
      initialStateFromTimefilter: null,
      now: getTestMoment().toDate(),
    });

    expect(initialState).toMatchInlineSnapshot(`
      Object {
        "latestPosition": Object {
          "tiebreaker": 0,
          "time": 1640865600000,
        },
        "refreshInterval": Object {
          "pause": true,
          "value": 5000,
        },
        "targetPosition": Object {
          "tiebreaker": 0,
          "time": 1640865600000,
        },
        "timeRange": Object {
          "expression": Object {
            "from": "2021-12-30T11:00:00.000Z",
            "to": "2021-12-30T13:00:00.000Z",
          },
          "lastChangedCompletely": 1640995200000,
        },
        "timestamps": Object {
          "endTimestamp": 1640869200000,
          "lastChangedTimestamp": 1640995200000,
          "startTimestamp": 1640862000000,
        },
        "visiblePositions": Object {
          "endKey": null,
          "middleKey": null,
          "pagesAfterEnd": Infinity,
          "pagesBeforeStart": Infinity,
          "startKey": null,
        },
      }
    `);
  });
});

describe('function updateStateFromUrlState', () => {
  it('applies a new target position that is within the date range', () => {
    const initialState = createInitialTestState();
    const newState = updateStateFromUrlState({
      position: {
        time: initialState.timestamps.startTimestamp + 1,
        tiebreaker: 2,
      },
    })(initialState);

    expect(newState).toEqual({
      ...initialState,
      targetPosition: {
        time: initialState.timestamps.startTimestamp + 1,
        tiebreaker: 2,
      },
      latestPosition: {
        time: initialState.timestamps.startTimestamp + 1,
        tiebreaker: 2,
      },
    });
  });

  it('applies a new partial target position that is within the date range', () => {
    const initialState = createInitialTestState();
    const newState = updateStateFromUrlState({
      position: {
        time: initialState.timestamps.startTimestamp + 1,
      },
    })(initialState);

    expect(newState).toEqual({
      ...initialState,
      targetPosition: {
        time: initialState.timestamps.startTimestamp + 1,
        tiebreaker: 0,
      },
      latestPosition: {
        time: initialState.timestamps.startTimestamp + 1,
        tiebreaker: 0,
      },
    });
  });

  it('rejects a target position that is outside the date range', () => {
    const initialState = createInitialTestState();
    const newState = updateStateFromUrlState({
      position: {
        time: initialState.timestamps.startTimestamp - 1,
      },
    })(initialState);

    expect(newState).toEqual({
      ...initialState,
      targetPosition: null,
      latestPosition: null,
    });
  });

  it('applies a new time range and updates timestamps', () => {
    const initialState = createInitialTestState();
    const updateDate = getTestMoment().add(1, 'hour').toDate();
    const newState = updateStateFromUrlState(
      {
        start: 'now-2d',
        end: 'now-1d',
      },
      updateDate
    )(initialState);

    expect(newState).toEqual({
      ...initialState,
      timeRange: {
        expression: {
          from: 'now-2d',
          to: 'now-1d',
        },
        lastChangedCompletely: updateDate.valueOf(),
      },
      timestamps: {
        startTimestamp: moment(updateDate).subtract(2, 'day').valueOf(),
        endTimestamp: moment(updateDate).subtract(1, 'day').valueOf(),
        lastChangedTimestamp: updateDate.valueOf(),
      },
    });
  });
});

const getTestMoment = () => moment.utc('2022-01-01T00:00:00.000Z');

const createInitialTestState = () =>
  createInitialLogPositionState({
    initialStateFromUrl: null,
    initialStateFromTimefilter: null,
    now: getTestMoment().toDate(),
  });
