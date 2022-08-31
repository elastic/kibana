/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ProcessEvent } from '../../../common/types/process_tree';
import { TTYPlayerControls, TTYPlayerControlsDeps } from '.';

const MOCK_PROCESS_EVENT_START: ProcessEvent = {
  process: {
    entity_id: '1',
  },
};

const MOCK_PROCESS_EVENT_MIDDLE: ProcessEvent = {
  process: {
    entity_id: '2',
  },
};

const MOCK_PROCESS_EVENT_END: ProcessEvent = {
  process: {
    entity_id: '3',
  },
};

describe('TTYPlayerControls component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let props: TTYPlayerControlsDeps;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    props = {
      currentProcessEvent: MOCK_PROCESS_EVENT_START,
      processIdLineMap: {
        '1': {
          value: 0,
          next: 2,
        },
        '2': {
          value: 2,
          previous: 0,
          next: 4,
        },
        '3': {
          value: 4,
          previous: 2,
        },
      },
      lastProcessEntityId: '3',
      isPlaying: false,
      currentLine: 0,
      linesLength: 10,
      onSeekLine: jest.fn(),
      onTogglePlayback: jest.fn(),
      onClose: jest.fn(),
      onJumpToEvent: jest.fn(),
      textSizer: <div>tty text sizer placeholder</div>,
    };
  });

  it('mounts and renders the tty player controls', async () => {
    renderResult = mockedContext.render(<TTYPlayerControls {...props} />);
    expect(renderResult.queryByTestId('sessionView:TTYPlayerControls')).toBeTruthy();
    expect(renderResult.queryByTestId('sessionView:TTYPlayerControlsStart')).toBeTruthy();
    expect(renderResult.queryByTestId('sessionView:TTYPlayerControlsPrevious')).toBeTruthy();
    expect(renderResult.queryByTestId('sessionView:TTYPlayerControlsPlay')).toBeTruthy();
    expect(renderResult.queryByTestId('sessionView:TTYPlayerControlsNext')).toBeTruthy();
    expect(renderResult.queryByTestId('sessionView:TTYPlayerControlsEnd')).toBeTruthy();
    expect(renderResult.queryAllByTestId('sessionView:TTYPlayerControlsRange')).toBeTruthy();
    expect(renderResult.queryByText('tty text sizer placeholder')).toBeTruthy();
  });

  it('clicking on play triggers onTogglePlayback', async () => {
    renderResult = mockedContext.render(<TTYPlayerControls {...props} />);
    renderResult.queryByTestId('sessionView:TTYPlayerControlsPlay')?.click();
    expect(props.onTogglePlayback).toHaveBeenCalledTimes(1);
  });

  it('clicking on next button triggers onSeekLine', async () => {
    renderResult = mockedContext.render(<TTYPlayerControls {...props} />);
    renderResult.queryByTestId('sessionView:TTYPlayerControlsNext')?.click();
    expect(props.onSeekLine).toHaveBeenCalledWith(2);
  });

  it('clicking on previous button triggers onSeekLine', async () => {
    renderResult = mockedContext.render(
      <TTYPlayerControls {...props} currentProcessEvent={MOCK_PROCESS_EVENT_MIDDLE} />
    );
    renderResult.queryByTestId('sessionView:TTYPlayerControlsPrevious')?.click();
    expect(props.onSeekLine).toHaveBeenCalledWith(0);
  });

  it('clicking on start button triggers onSeekLine', async () => {
    renderResult = mockedContext.render(
      <TTYPlayerControls {...props} currentProcessEvent={MOCK_PROCESS_EVENT_END} />
    );
    renderResult.queryByTestId('sessionView:TTYPlayerControlsStart')?.click();
    expect(props.onSeekLine).toHaveBeenCalledWith(0);
  });

  it('clicking on end button triggers onSeekLine', async () => {
    renderResult = mockedContext.render(<TTYPlayerControls {...props} />);
    renderResult.queryByTestId('sessionView:TTYPlayerControlsEnd')?.click();
    expect(props.onSeekLine).toHaveBeenCalledWith(4);
  });

  it('start and previous buttons are disabled if currentProcessEntityId is start', async () => {
    renderResult = mockedContext.render(<TTYPlayerControls {...props} />);
    renderResult.queryByTestId('sessionView:TTYPlayerControlsPrevious')?.click();
    expect(props.onSeekLine).not.toHaveBeenCalled();
    renderResult.queryByTestId('sessionView:TTYPlayerControlsStart')?.click();
    expect(props.onSeekLine).not.toHaveBeenCalled();
  });

  it('end and next buttons are disabled if currentProcessEntityId is end', async () => {
    renderResult = mockedContext.render(
      <TTYPlayerControls {...props} currentProcessEvent={MOCK_PROCESS_EVENT_END} />
    );
    renderResult.queryByTestId('sessionView:TTYPlayerControlsNext')?.click();
    expect(props.onSeekLine).not.toHaveBeenCalled();
    renderResult.queryByTestId('sessionView:TTYPlayerControlsEnd')?.click();
    expect(props.onSeekLine).not.toHaveBeenCalled();
  });
});
