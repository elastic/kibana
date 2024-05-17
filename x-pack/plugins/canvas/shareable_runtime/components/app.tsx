/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import React, { FC } from 'react';
import { RendererSpec } from '../../types';
import { CanvasShareableStateProvider, initialCanvasShareableState } from '../context';
import { renderFunctions } from '../supported_renderers';
import { CanvasRenderedWorkpad, CanvasShareableState, Stage } from '../types';
import { Canvas } from './canvas';

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

  renderFunctions.forEach((fn) => {
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
    <EuiProvider>
      <CanvasShareableStateProvider initialState={initialState}>
        <Canvas />
      </CanvasShareableStateProvider>
    </EuiProvider>
  );
};
