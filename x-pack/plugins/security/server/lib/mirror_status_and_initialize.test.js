/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */
import { EventEmitter } from 'events';
import { once } from 'lodash';
import { mirrorStatusAndInitialize } from './mirror_status_and_initialize';

['red', 'yellow', 'disabled' ].forEach(state => {
  test(`mirrors ${state} immediately`, () => {
    const message = `${state} is the status`;
    const upstreamStatus = new EventEmitter();
    upstreamStatus.state = state;
    upstreamStatus.message = message;

    const downstreamStatus = {
      [state]: jest.fn()
    };

    mirrorStatusAndInitialize(upstreamStatus, downstreamStatus);
    expect(downstreamStatus[state]).toHaveBeenCalledTimes(1);
    expect(downstreamStatus[state]).toHaveBeenCalledWith(message);
  });
});

test(`calls onGreen and doesn't immediately set downstream status when the initial status is green`, () => {
  const upstreamStatus = new EventEmitter();
  upstreamStatus.state = 'green';
  upstreamStatus.message = '';

  const downstreamStatus = {
    green: jest.fn()
  };

  const onGreenMock = jest.fn().mockImplementation(() => new Promise(() => {}));
  mirrorStatusAndInitialize(upstreamStatus, downstreamStatus, onGreenMock);
  expect(onGreenMock).toHaveBeenCalledTimes(1);
  expect(downstreamStatus.green).toHaveBeenCalledTimes(0);
});

test(`only calls onGreen once if it resolves immediately`, () => {
  const upstreamStatus = new EventEmitter();
  upstreamStatus.state = 'green';
  upstreamStatus.message = '';

  const downstreamStatus = {
    green: () => {}
  };

  const onGreenMock = jest.fn().mockImplementation(() => Promise.resolve());

  mirrorStatusAndInitialize(upstreamStatus, downstreamStatus, onGreenMock);
  upstreamStatus.emit('change', '', '', 'green', '');
  expect(onGreenMock).toHaveBeenCalledTimes(1);
});

test(`calls onGreen twice if it rejects`, (done) => {
  const upstreamStatus = new EventEmitter();
  upstreamStatus.state = 'green';
  upstreamStatus.message = '';

  const downstreamStatus = {
    red: once(() => {
      // once we see this red, we immediately trigger the upstream status again
      // to have it retrigger the onGreen function
      upstreamStatus.emit('change', '', '', 'green', '');
    }),
  };

  let count = 0;
  const onGreenMock = jest.fn().mockImplementation(() => {
    if (++count === 2) {
      done();
    }

    return Promise.reject(new Error());
  });

  mirrorStatusAndInitialize(upstreamStatus, downstreamStatus, onGreenMock);
});

test(`sets downstream status to green when onGreen promise resolves`, (done) => {
  const state = 'green';
  const message = `${state} is the status`;
  const upstreamStatus = new EventEmitter();
  upstreamStatus.state = state;
  upstreamStatus.message = message;

  const downstreamStatus = {
    green: () => {
      done();
    }
  };

  const onGreenMock = jest.fn().mockImplementation(() => Promise.resolve());
  mirrorStatusAndInitialize(upstreamStatus, downstreamStatus, onGreenMock);
});

test(`sets downstream status to red when onGreen promise rejects`, (done) => {
  const upstreamStatus = new EventEmitter();
  upstreamStatus.state = 'green';
  upstreamStatus.message = '';

  const errorMessage = 'something went real wrong';

  const downstreamStatus = {
    red: (msg) => {
      expect(msg).toBe(errorMessage);
      done();
    }
  };

  const onGreenMock = jest.fn().mockImplementation(() => Promise.reject(new Error(errorMessage)));
  mirrorStatusAndInitialize(upstreamStatus, downstreamStatus, onGreenMock);
});

['red', 'yellow', 'disabled' ].forEach(state => {
  test(`switches from uninitialized to ${state} on event`, () => {
    const message = `${state} is the status`;
    const upstreamStatus = new EventEmitter();
    upstreamStatus.state = 'uninitialized';
    upstreamStatus.message = 'uninitialized';

    const downstreamStatus = {
      uninitialized: jest.fn(),
      [state]: jest.fn(),
    };

    mirrorStatusAndInitialize(upstreamStatus, downstreamStatus);
    upstreamStatus.emit('change', '', '', state, message);
    expect(downstreamStatus[state]).toHaveBeenCalledTimes(1);
    expect(downstreamStatus[state]).toHaveBeenCalledWith(message);
  });
});
