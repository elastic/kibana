/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { PickEventType } from './pick_events';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  mockSourcererState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../../../common/mock';
import { TimelineEventsType } from '../../../../../common';
import { createStore } from '../../../../common/store';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { isSignalIndex } from '../../../../common/store/sourcerer/helpers';

describe('Pick Events/Timeline Sourcerer', () => {
  const defaultProps = {
    eventType: 'all' as TimelineEventsType,
    onChangeEventTypeAndIndexesName: jest.fn(),
  };
  const initialPatterns = [
    ...mockSourcererState.defaultDataView.patternList.filter(
      (p) => !isSignalIndex(p, mockSourcererState.signalIndexName)
    ),
    mockSourcererState.signalIndexName,
  ];
  const { storage } = createSecuritySolutionStorageMock();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  it('renders', () => {
    const wrapper = render(
      <TestProviders>
        <PickEventType {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(wrapper.getByTestId('sourcerer-timeline-trigger'));
    expect(wrapper.getByTestId('timeline-sourcerer').textContent).toEqual(
      initialPatterns.sort().join('')
    );
    fireEvent.click(wrapper.getByTestId(`sourcerer-accordion`));
    fireEvent.click(wrapper.getByTestId('comboBoxToggleListButton'));
    const optionNodes = wrapper.getAllByTestId('sourcerer-option');
    expect(optionNodes.length).toBe(1);
  });
  it('Removes duplicate options from options list', () => {
    const store = createStore(
      {
        ...mockGlobalState,
        sourcerer: {
          ...mockGlobalState.sourcerer,
          defaultDataView: {
            ...mockGlobalState.sourcerer.defaultDataView,
            id: '1234',
            title: 'filebeat-*,auditbeat-*,auditbeat-*,auditbeat-*,auditbeat-*',
            patternList: ['filebeat-*', 'auditbeat-*'],
          },
          kibanaDataViews: [
            {
              ...mockGlobalState.sourcerer.defaultDataView,
              id: '1234',
              title: 'filebeat-*,auditbeat-*,auditbeat-*,auditbeat-*,auditbeat-*',
              patternList: ['filebeat-*', 'auditbeat-*'],
            },
          ],
          sourcererScopes: {
            ...mockGlobalState.sourcerer.sourcererScopes,
            [SourcererScopeName.timeline]: {
              ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
              loading: false,
              selectedDataViewId: '1234',
              selectedPatterns: ['filebeat-*'],
            },
          },
        },
      },
      SUB_PLUGINS_REDUCER,
      kibanaObservable,
      storage
    );
    const wrapper = render(
      <TestProviders store={store}>
        <PickEventType {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(wrapper.getByTestId(`sourcerer-timeline-trigger`));
    fireEvent.click(wrapper.getByTestId(`sourcerer-accordion`));
    fireEvent.click(wrapper.getByTestId(`comboBoxToggleListButton`));
    expect(
      wrapper.getByTestId('comboBoxOptionsList timeline-sourcerer-optionsList').textContent
    ).toEqual('auditbeat-*');
  });
  const state = {
    ...mockGlobalState,
    sourcerer: {
      ...mockGlobalState.sourcerer,
      sourcererScopes: {
        ...mockGlobalState.sourcerer.sourcererScopes,
        [SourcererScopeName.timeline]: {
          ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
          loading: false,
          selectedDataViewId: mockGlobalState.sourcerer.defaultDataView.id,
          selectedPatterns: ['filebeat-*'],
        },
      },
    },
  };
  const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  it('correctly filters options', () => {
    const wrapper = render(
      <TestProviders store={store}>
        <PickEventType {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(wrapper.getByTestId('sourcerer-timeline-trigger'));
    fireEvent.click(wrapper.getByTestId('comboBoxToggleListButton'));
    fireEvent.click(wrapper.getByTestId('sourcerer-accordion'));
    const optionNodes = wrapper.getAllByTestId('sourcerer-option');
    expect(optionNodes.length).toBe(9);
  });
  it('reset button works', () => {
    const wrapper = render(
      <TestProviders store={store}>
        <PickEventType {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(wrapper.getByTestId('sourcerer-timeline-trigger'));
    expect(wrapper.getByTestId('timeline-sourcerer').textContent).toEqual('filebeat-*');

    fireEvent.click(wrapper.getByTestId('sourcerer-reset'));
    expect(wrapper.getByTestId('timeline-sourcerer').textContent).toEqual(
      initialPatterns.sort().join('')
    );
  });
});
