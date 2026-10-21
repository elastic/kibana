/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { composeStories } from '@storybook/react';
import * as stories from './session_replay_player.stories';
import {
  installIframeSandboxProperty,
  silenceJsdomScrollErrors,
} from '../test_helpers/jsdom_rrweb';

const composed = composeStories(stories);

/** What each story shows once it has settled, as a test id. */
const SETTLED: Record<string, string> = {
  NoRecording: 'sessionReplayUnavailable-noRecording',
  NoRecordingWithAction: 'sessionReplayUnavailable-noRecording',
  SampledOut: 'sessionReplayUnavailable-sampledOut',
  PastRetention: 'sessionReplayUnavailable-pastRetention',
  IncompleteRecording: 'sessionReplayIncomplete',
  FirstPageFailure: 'sessionReplayFailed',
};
const PLAYABLE = 'sessionReplayControls';

/**
 * jsdom cannot rebuild the hostile page's document (it rejects a second root element); the same
 * story is exercised in a real browser by the conformance run described in the README.
 */
const NOT_RUNNABLE_IN_JSDOM = new Set(['HostileContent']);

beforeAll(() => {
  installIframeSandboxProperty();
  silenceJsdomScrollErrors();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('stories', () => {
  it.each(Object.keys(composed).filter((name) => !NOT_RUNNABLE_IN_JSDOM.has(name)))(
    '%s renders',
    async (name) => {
      const Story = composed[name as keyof typeof composed];

      const { unmount } = render(<Story />);

      expect(
        await screen.findByTestId(SETTLED[name] ?? PLAYABLE, {}, { timeout: 5_000 })
      ).toBeInTheDocument();
      unmount();
    }
  );
});
