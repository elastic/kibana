/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { CanvasRenderedWorkpad, CanvasShareableState, Stage } from '../types';
import { RendererSpec } from '../../types';
import { initialCanvasShareableState, CanvasShareableStateProvider } from '../context';
import { Canvas } from './canvas';
import { renderFunctions } from '../supported_renderers';

interface Props {
  /**
   * An object describing the state of the workpad container.
   */
  stage: Stage;

  /**
   * The workpad being rendered within the shareable area.
   */
  workpad: CanvasRenderedWorkpad;
}

/**
 * The overall Canvas Shareable Workpad app; the highest-layer component.
 */
export const App: FC<Props> = ({ workpad, stage }) => {
  const renderers: { [key: string]: RendererSpec } = {};

  renderFunctions.forEach(fn => {
    const func = fn();
    renderers[func.name] = func;
  });

  const initialState: CanvasShareableState = {
    ...initialCanvasShareableState,
    stage,
    renderers,
    workpad,
  };

  return (
    <CanvasShareableStateProvider initialState={initialState}>
      <Canvas />
    </CanvasShareableStateProvider>
  );
};
