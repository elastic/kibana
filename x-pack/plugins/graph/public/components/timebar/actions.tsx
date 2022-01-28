/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';

import { i18n } from '@kbn/i18n';
import type { Action, ActionExecutionContext } from 'src/plugins/ui_actions/public';
import { TimeRange } from '../../types/workspace_state';
import type { LensPublicStart, TypedLensByValueInput } from '../../../../lens/public';

export const TIME_STEPS = 5;
export const DURATION = 15000;

interface ActionFactoryProps {
  id: string;
  label: string | ((context: ActionExecutionContext<object>) => string);
  icon: string | ((context: ActionExecutionContext<object>) => string);
  callback: () => void;
}

function createTimePlayer({
  duration,
  setIndex,
}: {
  duration: number;
  setIndex: (i: number | undefined) => void;
}) {
  let start: undefined | number;
  const stepLength = duration / TIME_STEPS;
  let cancelled = false;

  return {
    play: () => {
      function play(time: number) {
        if (start == null) {
          start = time;
        }
        const elapsed = time - start;

        const index = Math.round(elapsed / stepLength);
        setIndex(index);
        if (elapsed < duration && !cancelled) {
          requestAnimationFrame(play);
        } else {
          setIndex(undefined);
        }
      }
      requestAnimationFrame(play);
    },
    stop: () => {
      cancelled = true;
    },
  };
}

function getCallbackAction({ id, label, icon, callback }: ActionFactoryProps): Action {
  return {
    id,
    order: 48,
    getDisplayName: (context: ActionExecutionContext<object>): string => {
      return typeof label === 'function' ? label(context) : label;
    },
    getIconType: (context: ActionExecutionContext<object>): string => {
      return typeof icon === 'function' ? icon(context) : icon;
    },
    type: 'actionButton',
    isCompatible: async (context: ActionExecutionContext<object>): Promise<boolean> => true,
    execute: async (context: ActionExecutionContext<object>): Promise<void> => {
      callback();
      return;
    },
  };
}

export function getCustomActions({
  lens,
  attributes,
  timeRange,
  setPlayIndex,
}: {
  lens: LensPublicStart;
  attributes: TypedLensByValueInput['attributes'];
  timeRange?: TimeRange;
  setPlayIndex: (i: number | undefined) => void;
}) {
  if (!lens.canUseEditor() || !timeRange) {
    return [];
  }

  const timeRangeMs = moment(timeRange.to).diff(moment(timeRange.from));
  const canPlay = timeRangeMs > DURATION;

  return [
    getCallbackAction({
      id: 'openInLensFromGraph',
      label: i18n.translate('xpack.graph.timebar.openInLens', {
        defaultMessage: 'Open in Lens',
      }),
      icon: 'lensApp',
      callback: () =>
        lens.navigateToPrefilledEditor(
          {
            id: '',
            timeRange,
            attributes,
          },
          {
            openInNewTab: true,
          }
        ),
    }),
    canPlay
      ? getCallbackAction({
          id: 'playTime',
          label: i18n.translate('xpack.graph.timebar.playTime', {
            defaultMessage: 'Play',
          }),
          icon: 'play',
          callback: () => {
            // start a controller that will update attributes periodically on the Lens embeddable
            const player = createTimePlayer({ duration: DURATION, setIndex: setPlayIndex });
            player.play();
          },
        })
      : null,
  ].filter(Boolean) as Action[];
}
