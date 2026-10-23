/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const PLAYER_ARIA_LABEL = i18n.translate('xpack.sessionReplayPlayer.player.ariaLabel', {
  defaultMessage: 'Session replay',
});

export const STAGE_ARIA_LABEL = i18n.translate('xpack.sessionReplayPlayer.stage.ariaLabel', {
  defaultMessage: 'Recorded page',
});

export const PLAY_LABEL = i18n.translate('xpack.sessionReplayPlayer.controls.play', {
  defaultMessage: 'Play',
});

export const PAUSE_LABEL = i18n.translate('xpack.sessionReplayPlayer.controls.pause', {
  defaultMessage: 'Pause',
});

export const REPLAY_LABEL = i18n.translate('xpack.sessionReplayPlayer.controls.replay', {
  defaultMessage: 'Replay from the start',
});

export const RESTART_LABEL = i18n.translate('xpack.sessionReplayPlayer.controls.restart', {
  defaultMessage: 'Restart',
});

export const SPEED_LABEL = i18n.translate('xpack.sessionReplayPlayer.controls.speed', {
  defaultMessage: 'Playback speed',
});

export const SKIP_IDLE_LABEL = i18n.translate('xpack.sessionReplayPlayer.controls.skipIdle', {
  defaultMessage: 'Skip idle',
});

export const BUFFERING_LABEL = i18n.translate('xpack.sessionReplayPlayer.controls.buffering', {
  defaultMessage: 'Loading more of the recording',
});

export const TIMELINE_LABEL = i18n.translate('xpack.sessionReplayPlayer.timeline.ariaLabel', {
  defaultMessage: 'Replay position',
});

export const TIMELINE_MARKERS_LABEL = i18n.translate(
  'xpack.sessionReplayPlayer.timeline.markersAriaLabel',
  { defaultMessage: 'Timeline markers' }
);

export const formatPositionText = (current: string, total: string): string =>
  i18n.translate('xpack.sessionReplayPlayer.timeline.valueText', {
    defaultMessage: '{current} of {total}',
    values: { current, total },
  });

export const formatSpeedOption = (speed: number): string =>
  i18n.translate('xpack.sessionReplayPlayer.controls.speedOption', {
    defaultMessage: '{speed}x',
    values: { speed },
  });

export const markerKindLabel = (kind: 'navigation' | 'error' | 'click'): string => {
  switch (kind) {
    case 'error':
      return i18n.translate('xpack.sessionReplayPlayer.marker.error', {
        defaultMessage: 'Error',
      });
    case 'navigation':
      return i18n.translate('xpack.sessionReplayPlayer.marker.navigation', {
        defaultMessage: 'Page',
      });
    case 'click':
      return i18n.translate('xpack.sessionReplayPlayer.marker.click', {
        defaultMessage: 'Click',
      });
  }
};

export const formatMarkerAriaLabel = ({
  kind,
  label,
  clock,
  count,
}: {
  kind: 'navigation' | 'error' | 'click';
  label: string;
  clock: string;
  count: number;
}): string =>
  count > 1
    ? i18n.translate('xpack.sessionReplayPlayer.marker.groupAriaLabel', {
        defaultMessage: '{count} events from {clock}, including {kind}: {label}',
        values: { count, clock, kind: markerKindLabel(kind), label },
      })
    : i18n.translate('xpack.sessionReplayPlayer.marker.ariaLabel', {
        defaultMessage: '{kind} at {clock}: {label}',
        values: { clock, kind: markerKindLabel(kind), label },
      });

export const LOADING_TITLE = i18n.translate('xpack.sessionReplayPlayer.state.loading', {
  defaultMessage: 'Loading the recording',
});

export const UNAVAILABLE_TITLES = {
  noRecording: i18n.translate('xpack.sessionReplayPlayer.state.noRecording.title', {
    defaultMessage: 'No recording for this session',
  }),
  sampledOut: i18n.translate('xpack.sessionReplayPlayer.state.sampledOut.title', {
    defaultMessage: 'This session was not recorded',
  }),
  pastRetention: i18n.translate('xpack.sessionReplayPlayer.state.pastRetention.title', {
    defaultMessage: 'This recording is no longer available',
  }),
} as const;

export const UNAVAILABLE_BODIES = {
  noRecording: i18n.translate('xpack.sessionReplayPlayer.state.noRecording.body', {
    defaultMessage: 'No replay data was received for this session.',
  }),
  sampledOut: i18n.translate('xpack.sessionReplayPlayer.state.sampledOut.body', {
    defaultMessage: 'Session replay is sampled, and this session was not selected for recording.',
  }),
  pastRetention: i18n.translate('xpack.sessionReplayPlayer.state.pastRetention.body', {
    defaultMessage: 'The recording is older than the retention period of the replay data.',
  }),
} as const;

export const INCOMPLETE_TITLE = i18n.translate('xpack.sessionReplayPlayer.state.incomplete.title', {
  defaultMessage: 'This recording is too short to play',
});

export const INCOMPLETE_BODY = i18n.translate('xpack.sessionReplayPlayer.state.incomplete.body', {
  defaultMessage:
    'The recording does not contain a full snapshot of the page, so there is nothing to show.',
});

export const FAILED_TITLE = i18n.translate('xpack.sessionReplayPlayer.state.failed.title', {
  defaultMessage: 'The recording could not be loaded',
});

export const RETRY_LABEL = i18n.translate('xpack.sessionReplayPlayer.state.retry', {
  defaultMessage: 'Try again',
});

export const PARTIAL_FAILED_TITLE = i18n.translate(
  'xpack.sessionReplayPlayer.state.partialFailed.title',
  { defaultMessage: 'Loading stopped before the end of the recording' }
);

export const TRUNCATED_TITLE = i18n.translate('xpack.sessionReplayPlayer.state.truncated.title', {
  defaultMessage: 'Only part of the recording is available',
});

export const TRUNCATED_BODY = i18n.translate('xpack.sessionReplayPlayer.state.truncated.body', {
  defaultMessage: 'The recording could not be loaded to its end, so playback stops earlier.',
});

export const LARGE_TITLE = i18n.translate('xpack.sessionReplayPlayer.state.large.title', {
  defaultMessage: 'This is a long recording',
});

export const LARGE_BODY = i18n.translate('xpack.sessionReplayPlayer.state.large.body', {
  defaultMessage:
    'A large part of it has loaded. Loading the rest uses more memory and may slow down the page.',
});

export const CONTINUE_LABEL = i18n.translate('xpack.sessionReplayPlayer.state.continue', {
  defaultMessage: 'Keep loading',
});

export const THUMBNAIL_ARIA_LABEL = i18n.translate(
  'xpack.sessionReplayPlayer.thumbnail.ariaLabel',
  {
    defaultMessage: 'Preview of the recorded page',
  }
);
