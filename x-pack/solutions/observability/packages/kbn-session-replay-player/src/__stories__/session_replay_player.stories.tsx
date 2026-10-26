/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiText,
} from '@elastic/eui';
import { SessionReplayPlayer } from '../..';
import type { ReplayTimeUpdateReason, SessionReplayPlayerHandle } from '../..';
import { withStoryInfo } from './story_info';
import {
  FIXTURES,
  Frame,
  ReplayStory,
  denseMarkers,
  markersWithError,
  withoutSnapshot,
} from './story_data';

const meta: Meta<typeof ReplayStory> = {
  title: 'Observability/Session replay player',
  component: ReplayStory,
  parameters: {
    docs: {
      description: {
        component:
          'Plays a recorded session. The host supplies the recording through a paging loader and ' +
          "decides which unavailable state applies. Recorded pages render in rrweb's sandboxed frame " +
          'without script execution, and remote content is neutralised unless its origin is allowed.',
      },
    },
  },
  decorators: [
    (Story) => (
      <Frame>
        <Story />
      </Frame>
    ),
    withStoryInfo,
  ],
};

export default meta;

type Story = StoryObj<typeof ReplayStory>;

export const Default: Story = {
  args: { events: FIXTURES.checkoutFlow, withMeta: true },
};

export const WithHostMarkers: Story = {
  args: {
    events: FIXTURES.checkoutFlow,
    markers: markersWithError(FIXTURES.checkoutFlow),
    withMeta: true,
  },
};

export const DenseMarkers: Story = {
  args: {
    events: FIXTURES.checkoutFlow,
    markers: denseMarkers(FIXTURES.checkoutFlow),
    withMeta: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Markers closer than 8 pixels merge into one; the merged marker shows the most ' +
          'important kind it holds, so an error is never hidden.',
      },
    },
  },
};

export const LongSession: Story = {
  args: { events: FIXTURES.longSession, loader: { pageSize: 5_000 }, withMeta: true },
  parameters: {
    docs: {
      description: {
        story: 'About two hours of recording. Turn on Skip idle to jump over quiet stretches.',
      },
    },
  },
};

export const ProgressiveLoading: Story = {
  args: {
    events: FIXTURES.checkoutFlow,
    loader: { pageSize: 50, latencyMs: 300 },
    withMeta: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Pages arrive slowly. Playback starts once enough has loaded; seek ahead to see the ' +
          'player wait for the part you asked for.',
      },
    },
  },
};

export const LoaderFailureAndRetry: Story = {
  args: {
    events: FIXTURES.checkoutFlow,
    loader: { pageSize: 50, latencyMs: 100, failOnRequests: [2] },
    withMeta: true,
  },
};

export const FirstPageFailure: Story = {
  args: { events: FIXTURES.checkoutFlow, loader: { pageSize: 50, failOnRequests: [0] } },
};

const unavailable = (reason: 'noRecording' | 'sampledOut' | 'pastRetention'): Story => ({
  render: () => (
    <Suspense fallback={null}>
      <SessionReplayPlayer sessionId={reason} recording={{ status: 'unavailable', reason }} />
    </Suspense>
  ),
});

export const NoRecording: Story = unavailable('noRecording');
export const SampledOut: Story = unavailable('sampledOut');
export const PastRetention: Story = unavailable('pastRetention');

export const NoRecordingWithAction: Story = {
  render: () => (
    <Suspense fallback={null}>
      <SessionReplayPlayer
        sessionId="with-action"
        recording={{
          status: 'unavailable',
          reason: 'noRecording',
          action: (
            <EuiButton
              data-test-subj="kbnSessionReplayPlayerNoRecordingWithActionBackToTheSessionButton"
              size="s"
            >
              Back to the session
            </EuiButton>
          ),
        }}
      />
    </Suspense>
  ),
};

export const IncompleteRecording: Story = {
  args: { events: withoutSnapshot(FIXTURES.checkoutFlow) },
};

export const FocusAndMaskedInput: Story = {
  args: { events: FIXTURES.focusAndInput, withMeta: true },
};

export const HostileContent: Story = {
  args: { events: FIXTURES.hostileContent, withMeta: true },
  parameters: {
    docs: {
      description: {
        story:
          'A recorded page that tries to run script and to fetch remote content, followed by ' +
          'hand-built events that try every other path. Nothing runs and nothing is requested: ' +
          'open the browser network panel to check.',
      },
    },
  },
};

export const CanvasImages: Story = {
  args: { events: FIXTURES.canvasChart, withMeta: true },
  parameters: {
    docs: {
      description: {
        story:
          'Canvas recorded as images. They render while playing; seeking without playing shows ' +
          'the hatched placeholder.',
      },
    },
  },
};

export const CanvasDrawingCommands: Story = {
  args: { events: FIXTURES.canvasCommands, withMeta: true },
};

export const InNarrowPanel: Story = {
  args: { events: FIXTURES.checkoutFlow, withMeta: true },
  decorators: [
    (Story) => (
      <Frame width={320} height={240}>
        <Story />
      </Frame>
    ),
  ],
};

const InFlyoutStory = () => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <>
      <EuiButton
        data-test-subj="kbnSessionReplayPlayerInFlyoutStoryOpenTheFlyoutButton"
        onClick={() => setIsOpen(true)}
      >
        Open the flyout
      </EuiButton>
      {isOpen && (
        <EuiFlyout onClose={() => setIsOpen(false)} size="s" aria-label="Session replay">
          <EuiFlyoutBody>
            <Frame height={480}>
              <ReplayStory events={FIXTURES.checkoutFlow} withMeta />
            </Frame>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};

export const InFlyout: Story = { render: () => <InFlyoutStory /> };

const DeepLinkAndExternalSeekStory = () => {
  const handle = useRef<SessionReplayPlayerHandle>(null);
  const [updates, setUpdates] = useState<string[]>([]);
  const onTimeUpdate = (offsetMs: number, reason: ReplayTimeUpdateReason) =>
    setUpdates((previous) => [`${reason} at ${offsetMs} ms`, ...previous].slice(0, 6));
  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false} style={{ height: '100%' }}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="kbnSessionReplayPlayerDeepLinkAndExternalSeekStorySeekTo010Button"
              size="s"
              onClick={() => handle.current?.seek(10_000)}
            >
              Seek to 0:10
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="kbnSessionReplayPlayerDeepLinkAndExternalSeekStoryPlayButton"
              size="s"
              onClick={() => handle.current?.play()}
            >
              Play
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="kbnSessionReplayPlayerDeepLinkAndExternalSeekStoryPauseButton"
              size="s"
              onClick={() => handle.current?.pause()}
            >
              Pause
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="kbnSessionReplayPlayerDeepLinkAndExternalSeekStoryReadPositionButton"
              size="s"
              onClick={() =>
                setUpdates((previous) => [
                  `position ${handle.current?.getCurrentOffsetMs()} ms`,
                  ...previous,
                ])
              }
            >
              Read position
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText size="xs" data-test-subj="storyUpdates">
          {updates.join(' · ')}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <ReplayStory
          ref={handle}
          events={FIXTURES.checkoutFlow}
          withMeta
          initialOffsetMs={5_000}
          onTimeUpdate={onTimeUpdate}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const DeepLinkAndExternalSeek: Story = { render: () => <DeepLinkAndExternalSeekStory /> };

const MountUnmountStressStory = () => {
  const [mounted, setMounted] = useState(true);
  const [rounds, setRounds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const timer = setInterval(() => {
      setMounted((current) => !current);
      setRounds((count) => count + 1);
    }, 150);
    return () => clearInterval(timer);
  }, [running]);

  return (
    <>
      <EuiButton
        data-test-subj="kbnSessionReplayPlayerMountUnmountStressStoryButton"
        size="s"
        onClick={() => setRunning((current) => !current)}
      >
        {running ? 'Stop' : 'Mount and unmount quickly'}
      </EuiButton>
      <EuiText size="xs">Rounds: {rounds}</EuiText>
      <Frame height={420}>
        {mounted && <ReplayStory events={FIXTURES.checkoutFlow} withMeta />}
      </Frame>
    </>
  );
};

export const MountUnmountStress: Story = { render: () => <MountUnmountStressStory /> };
