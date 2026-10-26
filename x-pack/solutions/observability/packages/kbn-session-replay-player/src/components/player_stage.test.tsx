/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PlayerStage } from './player_stage';

describe('PlayerStage', () => {
  const originalRect = Element.prototype.getBoundingClientRect;

  afterEach(() => {
    Element.prototype.getBoundingClientRect = originalRect;
  });

  it('hands the render root to the caller and clears it on unmount', () => {
    const onRootChange = jest.fn();
    const { unmount } = render(<PlayerStage onRootChange={onRootChange} />);

    expect(onRootChange).toHaveBeenCalledWith(screen.getByTestId('sessionReplayStageRoot'));
    unmount();

    expect(onRootChange).toHaveBeenLastCalledWith(null);
  });

  it('fills the stage until the recorded viewport is known', () => {
    render(<PlayerStage onRootChange={jest.fn()} />);

    expect(screen.getByTestId('sessionReplayStageRoot')).toHaveStyle({ width: '100%' });
  });

  it('scales and centres the recorded viewport', () => {
    Element.prototype.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 500, height: 250, right: 500, bottom: 250 } as DOMRect);

    render(<PlayerStage viewport={{ width: 1000, height: 500 }} onRootChange={jest.fn()} />);

    expect(screen.getByTestId('sessionReplayStageRoot')).toHaveStyle({
      width: '1000px',
      height: '500px',
      transform: 'translate(0px, 0px) scale(0.5)',
    });
  });

  it('never scales above the recorded size', () => {
    Element.prototype.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 } as DOMRect);

    render(<PlayerStage viewport={{ width: 400, height: 200 }} onRootChange={jest.fn()} />);

    expect(screen.getByTestId('sessionReplayStageRoot')).toHaveStyle({
      transform: 'translate(300px, 400px) scale(1)',
    });
  });
});
