/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import userEvent from '@testing-library/user-event';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { sessionViewIOEventsMock } from '../../../common/mocks/responses/session_view_io_events.mock';
import { useIOLines } from '../tty_player/hooks';
import { ProcessEventsPage } from '../../../common/types/process_tree';
import { TTYSearchBar, TTYSearchBarDeps } from '.';

// TTYSearchBar is a HOC to SessionViewSearchBar which is already well tested
// so these tests will only focus on newly added functionality
describe('TTYSearchBar component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let props: TTYSearchBarDeps;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();

    const events = sessionViewIOEventsMock?.events?.map((event) => event._source);
    const pages: ProcessEventsPage[] = [{ events, total: events?.length }];
    const { result } = renderHook(() => useIOLines(pages));
    const lines = result.current.lines;

    props = {
      lines,
      seekToLine: jest.fn(),
      xTermSearchFn: jest.fn(),
      setIsPlaying: jest.fn(),
      searchQuery: '',
      setSearchQuery: jest.fn(),
    };
  });

  it('mounts and renders the search bar', async () => {
    renderResult = mockedContext.render(<TTYSearchBar {...props} />);
    expect(renderResult.queryByTestId('sessionView:searchBar')).toBeTruthy();
  });

  it('does a search when a user enters text and hits enter', async () => {
    renderResult = mockedContext.render(<TTYSearchBar {...props} searchQuery="-h" />);

    expect(props.seekToLine).toHaveBeenCalledTimes(1);

    // there is a slight delay in the seek in xtermjs, so we wait 100ms before trying to highlight a result.
    await new Promise((r) => setTimeout(r, 100));

    expect(props.xTermSearchFn).toHaveBeenCalledTimes(1);
    expect(props.xTermSearchFn).toHaveBeenNthCalledWith(1, '-h', 6);
    expect(props.setIsPlaying).toHaveBeenCalledWith(false);
  });

  it('calls seekToline and xTermSearchFn when currentMatch changes', async () => {
    renderResult = mockedContext.render(<TTYSearchBar {...props} searchQuery="-h" />);

    await new Promise((r) => setTimeout(r, 100));

    userEvent.click(renderResult.getByTestId('pagination-button-next'));

    await new Promise((r) => setTimeout(r, 100));

    // two calls, first instance -h is at line 22, 2nd at line 42
    expect(props.seekToLine).toHaveBeenCalledTimes(2);
    expect(props.seekToLine).toHaveBeenNthCalledWith(1, 26);
    expect(props.seekToLine).toHaveBeenNthCalledWith(2, 100);

    expect(props.xTermSearchFn).toHaveBeenCalledTimes(2);
    expect(props.xTermSearchFn).toHaveBeenNthCalledWith(1, '-h', 6);
    expect(props.xTermSearchFn).toHaveBeenNthCalledWith(2, '-h', 13);
    expect(props.setIsPlaying).toHaveBeenCalledTimes(2);
  });

  it('calls xTermSearchFn with empty query when search is cleared', async () => {
    renderResult = mockedContext.render(<TTYSearchBar {...props} searchQuery="-h" />);

    await new Promise((r) => setTimeout(r, 100));
    userEvent.click(renderResult.getByTestId('clearSearchButton'));
    await new Promise((r) => setTimeout(r, 100));

    renderResult.rerender(<TTYSearchBar {...props} />);

    expect(props.setSearchQuery).toHaveBeenNthCalledWith(1, '');
    expect(props.xTermSearchFn).toHaveBeenNthCalledWith(2, '', 0);
    expect(props.setIsPlaying).toHaveBeenCalledWith(false);
  });
});
