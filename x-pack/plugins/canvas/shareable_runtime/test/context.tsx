/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { CSSProperties, RefObject } from 'react';
import {
  initialCanvasShareableState,
  CanvasShareableStateProvider,
  useCanvasShareableState,
} from '../context/index';
import { renderFunctions } from '../supported_renderers';
import { CanvasShareableState } from '../types';
import { RendererSpec } from '../../types';
import { sharedWorkpads, WorkpadNames } from '.';

const Container = ({
  children,
  height,
  width,
  style,
}: Pick<Props, 'children' | 'height' | 'width' | 'style'>) => {
  const [{ refs }] = useCanvasShareableState();

  return (
    <div
      className="kbnCanvas"
      ref={refs.stage}
      style={{ height, width, overflow: 'hidden', position: 'relative', ...style }}
    >
      {children}
    </div>
  );
};

interface Props {
  children: any;
  source?: WorkpadNames;
  height?: number;
  width?: number;
  isScrubberVisible?: boolean;
  style?: CSSProperties;
  stageRef?: RefObject<HTMLDivElement>;
  toolbar?: boolean;
  autoplay?: boolean;
}

export const Context = ({
  children,
  height,
  width,
  isScrubberVisible,
  style,
  stageRef,
  source = 'hello',
  toolbar,
  autoplay,
}: Props) => {
  const renderers: { [key: string]: RendererSpec } = {};

  renderFunctions.forEach((rendererFn) => {
    const renderer = rendererFn();
    renderers[renderer.name] = renderer;
  });

  const { footer, settings } = initialCanvasShareableState;
  const { toolbar: toolbarSettings, autoplay: autoplaySettings } = settings;

  const workpad = sharedWorkpads[source];

  const initialState: CanvasShareableState = {
    ...initialCanvasShareableState,
    footer: {
      ...footer,
      isScrubberVisible: isScrubberVisible || footer.isScrubberVisible,
    },
    settings: {
      ...settings,
      toolbar: {
        ...toolbarSettings,
        isAutohide: !!toolbar,
      },
      autoplay: {
        ...autoplaySettings,
        isEnabled: !!autoplay,
      },
    },
    stage: {
      height: workpad.height / 2,
      page: 0,
      width: workpad.width / 2,
    },
    renderers,
    workpad,
    refs: {
      stage: stageRef || React.createRef(),
    },
  };

  return (
    <CanvasShareableStateProvider initialState={initialState}>
      <Container {...{ height, width, style }}>{children}</Container>
    </CanvasShareableStateProvider>
  );
};
