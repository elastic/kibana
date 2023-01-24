/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import userEvent from '@testing-library/user-event';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { DEFAULT_TTY_FONT_SIZE } from '../../../common/constants';
import { TTYTextSizer, TTYTextSizerDeps } from '.';

const FULL_SCREEN_FONT_SIZE = 12;

describe('TTYTextSizer component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let props: TTYTextSizerDeps;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    props = {
      isFullscreen: false,
      tty: {
        rows: 24,
        columns: 80,
      },
      containerHeight: 200,
      fontSize: DEFAULT_TTY_FONT_SIZE,
      onFontSizeChanged: jest.fn(),
    };
  });

  it('mounts and renders the text sizer controls', async () => {
    renderResult = mockedContext.render(<TTYTextSizer {...props} />);
    expect(renderResult.queryByTestId('sessionView:TTYTextSizer')).toBeTruthy();
  });

  it('emits a fontSize which will fit the container when ZoomFit clicked', async () => {
    renderResult = mockedContext.render(<TTYTextSizer {...props} />);

    const zoomFitBtn = renderResult.queryByTestId('sessionView:TTYZoomFit');

    if (zoomFitBtn) {
      userEvent.click(zoomFitBtn);
    }

    expect(props.onFontSizeChanged).toHaveBeenCalledTimes(1);
    expect(props.onFontSizeChanged).toHaveBeenCalledWith(6);
  });

  it('emits a larger fontSize when zoom in clicked', async () => {
    renderResult = mockedContext.render(<TTYTextSizer {...props} />);

    const zoomInBtn = renderResult.queryByTestId('sessionView:TTYZoomIn');

    if (zoomInBtn) {
      userEvent.click(zoomInBtn);
    }

    expect(props.onFontSizeChanged).toHaveBeenCalledTimes(1);
    expect(props.onFontSizeChanged).toHaveBeenCalledWith(DEFAULT_TTY_FONT_SIZE + 1);
  });

  it('emits a smaller fontSize when zoom out clicked', async () => {
    renderResult = mockedContext.render(<TTYTextSizer {...props} />);

    const zoomOutBtn = renderResult.queryByTestId('sessionView:TTYZoomOut');

    if (zoomOutBtn) {
      userEvent.click(zoomOutBtn);
    }

    expect(props.onFontSizeChanged).toHaveBeenCalledTimes(1);
    expect(props.onFontSizeChanged).toHaveBeenCalledWith(DEFAULT_TTY_FONT_SIZE - 1);
  });

  it('emits a font size to fit to full screen, when isFullscreen = true', async () => {
    renderResult = mockedContext.render(
      <TTYTextSizer {...props} isFullscreen containerHeight={400} />
    );

    const zoomFitBtn = renderResult.queryByTestId('sessionView:TTYZoomFit');

    if (zoomFitBtn) {
      userEvent.click(zoomFitBtn);
    }

    expect(props.onFontSizeChanged).toHaveBeenCalledTimes(1);
    expect(props.onFontSizeChanged).toHaveBeenCalledWith(FULL_SCREEN_FONT_SIZE);
  });
});
