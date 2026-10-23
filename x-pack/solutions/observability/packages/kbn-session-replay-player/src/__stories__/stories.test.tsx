/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { composeStories } from '@storybook/react';
import * as stories from './session_replay_player.stories';
import * as thumbnailStories from './thumbnail.stories';
import { STORY_INFO } from './story_info_content';
import {
  installIframeSandboxProperty,
  silenceJsdomScrollErrors,
} from '../test_helpers/jsdom_rrweb';

const composed = composeStories(stories);
const composedThumbnails = composeStories(thumbnailStories);

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

describe('thumbnail stories', () => {
  it('ThumbnailStates renders a placeholder and drawn thumbnails', async () => {
    const { ThumbnailStates } = composedThumbnails;

    const { unmount } = render(<ThumbnailStates />);

    await waitFor(() =>
      expect(
        screen
          .getAllByRole('img', { name: 'Preview of the recorded page' })
          .filter((thumbnail) => thumbnail.getAttribute('data-state') === 'drawn')
      ).toHaveLength(2)
    );
    unmount();
  });

  it('SessionListWithThumbnails renders every row', async () => {
    const { SessionListWithThumbnails } = composedThumbnails;

    const { unmount } = render(<SessionListWithThumbnails />);

    expect(
      await screen.findAllByRole('img', { name: 'Preview of the recorded page' })
    ).toHaveLength(25);
    unmount();
  });
});

describe('story information', () => {
  it.each(
    [...Object.values(composed), ...Object.values(composedThumbnails)].map((story) => [story.id])
  )('%s explains itself', (id) => {
    const info = STORY_INFO[id.split('--')[1]];

    expect(info?.about).toBeTruthy();
    expect(info?.notice.length).toBeGreaterThan(0);
  });

  it('has no entry for a story that does not exist', () => {
    const ids = [...Object.values(composed), ...Object.values(composedThumbnails)].map(
      (story) => story.id.split('--')[1]
    );

    expect(Object.keys(STORY_INFO).filter((key) => !ids.includes(key))).toEqual([]);
  });
});
