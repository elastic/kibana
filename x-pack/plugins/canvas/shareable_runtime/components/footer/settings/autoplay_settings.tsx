/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiHorizontalRule, EuiSwitch } from '@elastic/eui';
import {
  useCanvasShareableState,
  setAutoplayAction,
  setAutoplayIntervalAction,
} from '../../../context';
import { createTimeInterval } from '../../../../public/lib/time_interval';
import { CustomInterval } from '../../../../public/components/workpad_header/view_menu/custom_interval';

export type onSetAutoplayFn = (autoplay: boolean) => void;
export type onSetIntervalFn = (interval: string) => void;

export interface Props {
  /**
   * True if autoplay is currently enabled, false otherwise.
   */
  isEnabled: boolean;

  /**
   * The interval with which to move between pages.
   */
  interval: string;

  /**
   * The handler to invoke when Autoplay is enabled or disabled.
   */
  onSetAutoplay: onSetAutoplayFn;

  /**
   * The handler to invoke when the autoplay interval is set.
   */
  onSetInterval: onSetIntervalFn;
}

/**
 * The panel used to configure Autolay in Shareable Canvas Workpads.
 */
export const AutoplaySettingsComponent: FC<Props> = ({
  isEnabled,
  interval,
  onSetAutoplay,
  onSetInterval,
}: Props) => (
  <div style={{ padding: 16 }}>
    <EuiSwitch
      name="cycle"
      id="cycle"
      label="Cycle Slides"
      checked={isEnabled}
      onChange={() => onSetAutoplay(!isEnabled)}
    />
    <EuiHorizontalRule margin="m" />
    <CustomInterval
      defaultValue={interval}
      onSubmit={(value: number) => onSetInterval(createTimeInterval(value))}
    />
  </div>
);

/**
 * A store-connected container for the `AutoplaySettings` component.
 */
export const AutoplaySettings = () => {
  const [{ settings }, dispatch] = useCanvasShareableState();

  const { autoplay } = settings;
  const { isEnabled, interval } = autoplay;

  const onSetInterval: onSetIntervalFn = (newInterval: string) =>
    dispatch(setAutoplayIntervalAction(newInterval));

  const onSetAutoplay: onSetAutoplayFn = (enabled: boolean) => dispatch(setAutoplayAction(enabled));

  return <AutoplaySettingsComponent {...{ isEnabled, interval, onSetAutoplay, onSetInterval }} />;
};
