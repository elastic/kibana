/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PlayerAction, PlayerPhase } from './player_state';
import { INITIAL_PLAYER_PHASE, playerReducer } from './player_state';

const run = (actions: PlayerAction[], from: PlayerPhase = INITIAL_PLAYER_PHASE): PlayerPhase =>
  actions.reduce(playerReducer, from);

const loaded = (
  overrides: Partial<Extract<PlayerAction, { type: 'pagesLoaded' }>> = {}
): PlayerAction => ({
  type: 'pagesLoaded',
  playableCount: 10,
  hasPlayablePrefix: true,
  complete: false,
  loadedEndMs: 5_000,
  ...overrides,
});

const ready = (actions: PlayerAction[] = []): PlayerPhase => run([loaded(), ...actions]);

describe('playerReducer', () => {
  describe('loading to ready', () => {
    it('starts loading', () => {
      expect(INITIAL_PLAYER_PHASE).toEqual({ kind: 'loading' });
    });

    it('becomes ready and paused as soon as a playable prefix exists, while pages keep arriving', () => {
      expect(run([loaded()])).toEqual({ kind: 'ready', playback: 'paused', loading: 'more' });
    });

    it('stays loading until a playable prefix exists', () => {
      expect(run([loaded({ hasPlayablePrefix: false, playableCount: 1 })])).toEqual({
        kind: 'loading',
      });
    });

    it('is complete when the first page is also the last', () => {
      expect(run([loaded({ complete: true })])).toEqual({
        kind: 'ready',
        playback: 'paused',
        loading: 'complete',
      });
    });

    it('is unavailable with no recording when loading ends with no playable events', () => {
      expect(
        run([
          loaded({
            hasPlayablePrefix: false,
            playableCount: 0,
            complete: true,
            loadedEndMs: undefined,
          }),
        ])
      ).toEqual({ kind: 'unavailable', reason: 'noRecording' });
    });

    it('is incomplete when loading ends with events but no playable prefix', () => {
      expect(run([loaded({ hasPlayablePrefix: false, playableCount: 1, complete: true })])).toEqual(
        { kind: 'incomplete', playableCount: 1 }
      );
    });

    it('marks loading complete when the last page arrives', () => {
      expect(run([loaded(), loaded({ complete: true })])).toMatchObject({ loading: 'complete' });
    });
  });

  describe('unavailable and reset', () => {
    it('shows the reason the host gave', () => {
      expect(run([{ type: 'recordingUnavailable', reason: 'sampledOut' }])).toEqual({
        kind: 'unavailable',
        reason: 'sampledOut',
      });
    });

    it('returns to loading on reset, discarding a ready state', () => {
      expect(run([{ type: 'reset' }], ready())).toEqual(INITIAL_PLAYER_PHASE);
    });
  });

  describe('failures', () => {
    const error = new Error('boom');

    it('fails when nothing is playable yet', () => {
      expect(run([{ type: 'loadFailed', error, hasPlayablePrefix: false }])).toEqual({
        kind: 'failed',
        error,
      });
    });

    it('keeps the player and flags the loading failure once it is ready', () => {
      expect(run([{ type: 'loadFailed', error, hasPlayablePrefix: true }], ready())).toMatchObject({
        kind: 'ready',
        loading: 'failed',
      });
    });

    it('restarts loading on retry from a failed state', () => {
      const failed = run([{ type: 'loadFailed', error, hasPlayablePrefix: false }]);

      expect(run([{ type: 'retry' }], failed)).toEqual(INITIAL_PLAYER_PHASE);
    });

    it('resumes loading on retry while ready', () => {
      const failed = run([{ type: 'loadFailed', error, hasPlayablePrefix: true }], ready());

      expect(run([{ type: 'retry' }], failed)).toMatchObject({ loading: 'more' });
    });

    it('ignores retry when nothing failed', () => {
      expect(run([{ type: 'retry' }], ready())).toEqual(ready());
    });
  });

  describe('playback', () => {
    it('plays and pauses', () => {
      expect(run([{ type: 'play' }], ready())).toMatchObject({ playback: 'playing' });
      expect(run([{ type: 'play' }, { type: 'pause' }], ready())).toMatchObject({
        playback: 'paused',
      });
    });

    it('ends and replays from the end', () => {
      const ended = run([{ type: 'play' }, { type: 'finished' }], ready());

      expect(ended).toMatchObject({ playback: 'ended' });
      expect(run([{ type: 'play' }], ended)).toMatchObject({ playback: 'playing' });
    });

    it('does not leave the ended state on pause', () => {
      const ended = run([{ type: 'finished' }], ready());

      expect(run([{ type: 'pause' }], ended)).toMatchObject({ playback: 'ended' });
    });

    it('ignores playback actions before the player is ready', () => {
      expect(run([{ type: 'play' }])).toEqual(INITIAL_PLAYER_PHASE);
      expect(run([{ type: 'finished' }])).toEqual(INITIAL_PLAYER_PHASE);
    });
  });

  describe('seeking', () => {
    it('keeps the playback state when seeking inside the loaded range', () => {
      expect(
        run([{ type: 'play' }, { type: 'seek', offsetMs: 2_000, loadedEndMs: 5_000 }], ready())
      ).toMatchObject({ playback: 'playing' });
    });

    it('leaves the ended state when seeking back', () => {
      const ended = run([{ type: 'finished' }], ready());

      expect(run([{ type: 'seek', offsetMs: 0, loadedEndMs: 5_000 }], ended)).toMatchObject({
        playback: 'paused',
      });
    });

    it('buffers when seeking past the loaded range while pages are still arriving', () => {
      expect(run([{ type: 'seek', offsetMs: 9_000, loadedEndMs: 5_000 }], ready())).toMatchObject({
        playback: 'buffering',
        seekTargetMs: 9_000,
      });
    });

    it('resumes playing once the loaded range reaches the buffering target', () => {
      const phase = run(
        [{ type: 'seek', offsetMs: 9_000, loadedEndMs: 5_000 }, loaded({ loadedEndMs: 7_000 })],
        ready()
      );
      expect(phase).toMatchObject({ playback: 'buffering', seekTargetMs: 9_000 });

      expect(run([loaded({ loadedEndMs: 9_500 })], phase)).toMatchObject({
        playback: 'playing',
        seekTargetMs: undefined,
      });
    });

    it('stops buffering and pauses when loading ends before the target', () => {
      const buffering = run([{ type: 'seek', offsetMs: 9_000, loadedEndMs: 5_000 }], ready());

      expect(run([loaded({ complete: true, loadedEndMs: 6_000 })], buffering)).toMatchObject({
        playback: 'paused',
        loading: 'complete',
      });
      expect(run([{ type: 'loadingTruncated' }], buffering)).toMatchObject({
        playback: 'paused',
        loading: 'truncated',
      });
      expect(
        run([{ type: 'loadFailed', error: new Error('x'), hasPlayablePrefix: true }], buffering)
      ).toMatchObject({ playback: 'paused', loading: 'failed' });
    });

    it('does not buffer when seeking past the end of a finished load', () => {
      expect(
        run([loaded({ complete: true }), { type: 'seek', offsetMs: 9_000, loadedEndMs: 5_000 }])
      ).toMatchObject({ playback: 'paused' });
    });

    it('does not start playing while buffering', () => {
      const buffering = run([{ type: 'seek', offsetMs: 9_000, loadedEndMs: 5_000 }], ready());

      expect(run([{ type: 'play' }], buffering)).toMatchObject({ playback: 'buffering' });
    });

    it('lets pause cancel buffering', () => {
      const buffering = run([{ type: 'seek', offsetMs: 9_000, loadedEndMs: 5_000 }], ready());

      expect(run([{ type: 'pause' }], buffering)).toMatchObject({
        playback: 'paused',
        seekTargetMs: undefined,
      });
    });
  });

  describe('size threshold', () => {
    it('asks the user whether to continue while pages are arriving', () => {
      expect(run([{ type: 'sizeThresholdReached' }], ready())).toMatchObject({
        loading: 'awaitingContinue',
      });
    });

    it('continues loading when the user agrees', () => {
      const asking = run([{ type: 'sizeThresholdReached' }], ready());

      expect(run([{ type: 'continueLoading' }], asking)).toMatchObject({ loading: 'more' });
    });

    it('keeps buffering while the user decides, and resumes after continuing', () => {
      const asking = run(
        [{ type: 'seek', offsetMs: 9_000, loadedEndMs: 5_000 }, { type: 'sizeThresholdReached' }],
        ready()
      );
      expect(asking).toMatchObject({ playback: 'buffering', loading: 'awaitingContinue' });

      expect(
        run([{ type: 'continueLoading' }, loaded({ loadedEndMs: 9_500 })], asking)
      ).toMatchObject({
        playback: 'playing',
        loading: 'more',
      });
    });

    it('ignores the threshold once loading is complete', () => {
      const complete = run([loaded({ complete: true })]);

      expect(run([{ type: 'sizeThresholdReached' }], complete)).toEqual(complete);
    });

    it('ignores continue when no question is pending', () => {
      expect(run([{ type: 'continueLoading' }], ready())).toEqual(ready());
    });
  });

  it('does not change a failed or incomplete phase on late pages', () => {
    const failed = run([{ type: 'loadFailed', error: new Error('x'), hasPlayablePrefix: false }]);

    expect(run([loaded()], failed)).toEqual(failed);
  });
});
