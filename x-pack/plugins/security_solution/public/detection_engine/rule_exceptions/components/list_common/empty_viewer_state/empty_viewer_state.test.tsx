/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { EmptyViewerState } from './empty_viewer_state';
import { ViewerStatus } from '../types';

describe('EmptyViewerState', () => {
  it('it renders error screen when "viewerStatus" is "error" with the default title and body', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.ERROR}
        onCreateExceptionListItem={jest.fn()}
      />
    );

    expect(wrapper.getByTestId('error_viewer_state')).toBeTruthy();
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('error_title')).toHaveTextContent('Unable to load exception items');
    expect(wrapper.getByTestId('error_body')).toHaveTextContent(
      'There was an error loading the exception items. Contact your administrator for help.'
    );
  });
  it('it renders error screen when "viewerStatus" is "error" when sending the title and body props', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.ERROR}
        onCreateExceptionListItem={jest.fn()}
        title="Error title"
        body="Error body"
      />
    );

    expect(wrapper.getByTestId('error_viewer_state')).toBeTruthy();
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('error_title')).toHaveTextContent('Error title');
    expect(wrapper.getByTestId('error_body')).toHaveTextContent('Error body');
  });
  it('it renders loading screen when "viewerStatus" is "loading"', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.LOADING}
        onCreateExceptionListItem={jest.fn()}
      />
    );

    expect(wrapper.getByTestId('loading_viewer_state')).toBeTruthy();
    expect(wrapper).toMatchSnapshot();
  });
  it('it renders empty search screen when "viewerStatus" is "empty_search" with the default title and body', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY_SEARCH}
        onCreateExceptionListItem={jest.fn()}
      />
    );

    expect(wrapper.getByTestId('empty_search_viewer_state')).toBeTruthy();
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('empty_search_title')).toHaveTextContent(
      'No results match your search criteria'
    );
    expect(wrapper.getByTestId('empty_search_body')).toHaveTextContent('Try modifying your search');
  });
  it('it renders empty search screen when "viewerStatus" is "empty_search" when sending title and body props', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY_SEARCH}
        onCreateExceptionListItem={jest.fn()}
        title="Empty search title"
        body="Empty search body"
      />
    );

    expect(wrapper.getByTestId('empty_search_viewer_state')).toBeTruthy();
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('empty_search_title')).toHaveTextContent('Empty search title');
    expect(wrapper.getByTestId('empty_search_body')).toHaveTextContent('Empty search body');
  });
  it('it renders no items screen when "viewerStatus" is "empty" when sending title and body props', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY}
        onCreateExceptionListItem={jest.fn()}
        body="There are no endpoint exceptions."
        buttonText="Add endpoint exception"
      />
    );

    const { getByTestId } = wrapper;
    expect(getByTestId('empty_body')).toHaveTextContent('There are no endpoint exceptions.');
    expect(getByTestId('empty_state_button')).toHaveTextContent('Add endpoint exception');
    expect(getByTestId('empty_viewer_state')).toBeTruthy();
  });
  it('it renders no items screen when "viewerStatus" is "empty" with default title and body props', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY}
        onCreateExceptionListItem={jest.fn()}
      />
    );

    const { getByTestId } = wrapper;
    expect(wrapper).toMatchSnapshot();
    expect(getByTestId('empty_viewer_state')).toBeTruthy();
    expect(getByTestId('empty_title')).toHaveTextContent('Add exceptions to this rule');
    expect(getByTestId('empty_body')).toHaveTextContent(
      'There is no exception in your rule. Create your first rule exception.'
    );
    expect(getByTestId('empty_state_button')).toHaveTextContent('Create rule exception');
  });
  it('it renders no items screen when "viewerStatus" is "empty" with default title and body props and listType endPoint', () => {
    const wrapper = render(
      <EmptyViewerState
        isReadOnly={false}
        viewerStatus={ViewerStatus.EMPTY}
        onCreateExceptionListItem={jest.fn()}
        listType="endpoint"
      />
    );

    const { getByTestId } = wrapper;
    expect(wrapper).toMatchSnapshot();
    expect(getByTestId('empty_viewer_state')).toBeTruthy();
    expect(getByTestId('empty_title')).toHaveTextContent('Add exceptions to this rule');
    expect(getByTestId('empty_body')).toHaveTextContent(
      'There is no exception in your rule. Create your first rule exception.'
    );
    expect(getByTestId('empty_state_button')).toHaveTextContent('Create endpoint exception');
  });
});
