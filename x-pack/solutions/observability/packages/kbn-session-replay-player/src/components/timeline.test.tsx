/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Timeline } from './timeline';
import type { ReplayMarker } from '../types';

const START = 1_000_000;

const marker = (id: string, kind: ReplayMarker['kind'], offsetMs: number): ReplayMarker => ({
  id,
  kind,
  timestamp: START + offsetMs,
  label: id,
});

const renderTimeline = (props: Partial<React.ComponentProps<typeof Timeline>> = {}) => {
  const onSeek = jest.fn();
  render(
    <Timeline
      offsetMs={10_000}
      durationMs={60_000}
      startTimestamp={START}
      onSeek={onSeek}
      {...props}
    />
  );
  return { onSeek, slider: screen.getByRole('slider', { name: 'Replay position' }) };
};

describe('Timeline', () => {
  it('exposes the position to assistive technology', () => {
    const { slider } = renderTimeline();

    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '60000');
    expect(slider).toHaveAttribute('aria-valuenow', '10000');
    expect(slider).toHaveAttribute('aria-valuetext', '0:10 of 1:00');
  });

  it('seeks with the keyboard', () => {
    const { slider, onSeek } = renderTimeline();

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'End' });

    expect(onSeek).toHaveBeenNthCalledWith(1, 15_000);
    expect(onSeek).toHaveBeenNthCalledWith(2, 60_000);
  });

  it('leaves other keys alone', () => {
    const { slider, onSeek } = renderTimeline();

    fireEvent.keyDown(slider, { key: 'a' });

    expect(onSeek).not.toHaveBeenCalled();
  });

  it('seeks to a point on the track by pointer', () => {
    const { slider, onSeek } = renderTimeline();
    slider.getBoundingClientRect = () =>
      ({ left: 100, width: 200, top: 0, height: 10, right: 300, bottom: 10 } as DOMRect);

    fireEvent(slider, new MouseEvent('pointerdown', { bubbles: true, clientX: 200 }));

    expect(onSeek).toHaveBeenCalledWith(30_000);
  });

  it('does not seek an empty recording', () => {
    const { slider, onSeek } = renderTimeline({ durationMs: 0, offsetMs: 0 });
    slider.getBoundingClientRect = () => ({ left: 0, width: 200 } as DOMRect);

    fireEvent(slider, new MouseEvent('pointerdown', { bubbles: true, clientX: 100 }));

    expect(onSeek).not.toHaveBeenCalled();
  });

  describe('markers', () => {
    const withWidth = () => {
      // jsdom reports no layout; give every element a width so markers can be placed.
      const original = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 600, height: 10, right: 600, bottom: 10 } as DOMRect);
      return () => {
        Element.prototype.getBoundingClientRect = original;
      };
    };

    it('seeks to a marker and names it', () => {
      const restore = withWidth();
      const { onSeek } = renderTimeline({
        markers: [marker('checkout', 'navigation', 20_000)],
      });

      const button = screen.getByRole('button', { name: 'Page at 0:20: checkout' });
      fireEvent.click(button);

      expect(onSeek).toHaveBeenCalledWith(20_000);
      restore();
    });

    it('merges close markers and shows the most important kind', () => {
      const restore = withWidth();
      renderTimeline({
        markers: [
          marker('click-a', 'click', 20_000),
          marker('boom', 'error', 20_100),
          marker('click-b', 'click', 20_200),
        ],
      });

      const buttons = screen.getAllByTestId('sessionReplayMarker');

      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveAttribute('data-marker-kind', 'error');
      expect(buttons[0]).toHaveAccessibleName('3 events from 0:20, including Error: boom');
      restore();
    });

    it('shows no markers before the start of the recording is known', () => {
      renderTimeline({ startTimestamp: undefined, markers: [marker('a', 'error', 1_000)] });

      expect(screen.queryByTestId('sessionReplayMarker')).not.toBeInTheDocument();
    });
  });
});
