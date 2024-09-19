/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../../helpers';
import { setupTimelineTestBed, TimelineTestBed } from './timeline.helpers';

describe('<EditPolicy /> timeline', () => {
  let testBed: TimelineTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setDefaultResponses();

    await act(async () => {
      testBed = await setupTimelineTestBed();
    });

    const { component } = testBed;
    component.update();
  });

  test('showing all phases on the timeline', async () => {
    const { actions } = testBed;
    // This is how the default policy should look
    expect(actions.timeline.hasPhase('hot')).toBe(true);
    expect(actions.timeline.hasPhase('warm')).toBe(false);
    expect(actions.timeline.hasPhase('cold')).toBe(false);
    expect(actions.timeline.hasPhase('delete')).toBe(false);

    await actions.togglePhase('warm');
    expect(actions.timeline.hasPhase('hot')).toBe(true);
    expect(actions.timeline.hasPhase('warm')).toBe(true);
    expect(actions.timeline.hasPhase('cold')).toBe(false);
    expect(actions.timeline.hasPhase('delete')).toBe(false);

    await actions.togglePhase('cold');
    expect(actions.timeline.hasPhase('hot')).toBe(true);
    expect(actions.timeline.hasPhase('warm')).toBe(true);
    expect(actions.timeline.hasPhase('cold')).toBe(true);
    expect(actions.timeline.hasPhase('delete')).toBe(false);

    await actions.togglePhase('delete');
    expect(actions.timeline.hasPhase('hot')).toBe(true);
    expect(actions.timeline.hasPhase('warm')).toBe(true);
    expect(actions.timeline.hasPhase('cold')).toBe(true);
    expect(actions.timeline.hasPhase('delete')).toBe(true);
  });
});
