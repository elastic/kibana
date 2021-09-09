/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { Sourcerer } from './index';
import { sourcererActions, sourcererModel } from '../../store/sourcerer';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../mock';
import { createStore, State } from '../../store';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
const defaultProps = {
  scope: sourcererModel.SourcererScopeName.default,
};
describe('Sourcerer component', () => {
  const state: State = mockGlobalState;
  const { id, patternList, title } = state.sourcerer.defaultDataView;
  const checkOptionsAndSelections = (wrapper: ReactWrapper, patterns: string[]) => ({
    availableOptionCount: wrapper.find(`[data-test-subj="sourcerer-combo-option"]`).length,
    optionsSelected: patterns.every((pattern) =>
      wrapper
        .find(`[data-test-subj="sourcerer-combo-box"] span[title="${pattern}"]`)
        .first()
        .exists()
    ),
  });

  const mockOptions = patternList.map((p) => ({
    label: p,
    value: p,
  }));

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('Mounts with all options selected', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    expect(
      wrapper.find(`[data-test-subj="sourcerer-combo-box"]`).first().prop('selectedOptions')
    ).toEqual(mockOptions);
  });
  it('Mounts with multiple options selected', () => {
    const state2 = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        kibanaDataViews: [
          state.sourcerer.defaultDataView,
          { id: '1234', title: 'auditbeat-*', patternList: ['auditbeat-*'] },
          { id: '12347', title: 'packetbeat-*', patternList: ['packetbeat-*'] },
        ],
        sourcererScopes: {
          ...mockGlobalState.sourcerer.sourcererScopes,
          [SourcererScopeName.default]: {
            ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
            loading: false,
            patternList,
            selectedDataViewId: id,
            selectedPatterns: patternList.slice(0, 2),
          },
        },
      },
    };

    store = createStore(state2, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="comboBoxInput"]`).first().simulate('click');
    expect(checkOptionsAndSelections(wrapper, patternList.slice(0, 2))).toEqual({
      availableOptionCount: title.split(',').length - 2,
      optionsSelected: true,
    });
  });
  it('onSave dispatches setSelectedKip', async () => {
    store = createStore(
      {
        ...state,
        sourcerer: {
          ...state.sourcerer,
          kibanaDataViews: [
            state.sourcerer.defaultDataView,
            { id: '1234', title: 'filebeat-*', patternList: ['filebeat-*'] },
          ],
          sourcererScopes: {
            ...state.sourcerer.sourcererScopes,
            [SourcererScopeName.default]: {
              ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
              loading: false,
              selectedDataViewId: id,
              selectedPatterns: patternList.slice(0, 2),
            },
          },
        },
      },
      SUB_PLUGINS_REDUCER,
      kibanaObservable,
      storage
    );
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="comboBoxInput"]`).first().simulate('click');
    expect(checkOptionsAndSelections(wrapper, patternList.slice(0, 2))).toEqual({
      availableOptionCount: title.split(',').length - 2,
      optionsSelected: true,
    });

    wrapper.find(`[data-test-subj="sourcerer-combo-option"]`).first().simulate('click');
    expect(checkOptionsAndSelections(wrapper, patternList.slice(0, 3))).toEqual({
      availableOptionCount: title.split(',').length - 3,
      optionsSelected: true,
    });
    wrapper.find(`[data-test-subj="sourcerer-save"]`).first().simulate('click');
    expect(wrapper.find(`[data-test-subj="sourcerer-popover"]`).first().prop('isOpen')).toBeFalsy();

    expect(mockDispatch).toHaveBeenCalledWith(
      sourcererActions.setSelectedKip({
        id: SourcererScopeName.default,
        selectedDataViewId: id,
        selectedPatterns: patternList.slice(0, 3),
      })
    );
  });
  it('resets to default index pattern', async () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="comboBoxInput"]`).first().simulate('click');

    expect(checkOptionsAndSelections(wrapper, patternList)).toEqual({
      availableOptionCount: title.split(',').length - patternList.length, // 1,
      optionsSelected: true,
    });

    wrapper
      .find(
        `[data-test-subj="sourcerer-combo-box"] [title="${patternList[0]}"] button.euiBadge__iconButton`
      )
      .first()
      .simulate('click');
    expect(checkOptionsAndSelections(wrapper, patternList.slice(1, patternList.length))).toEqual({
      availableOptionCount: title.split(',').length - (patternList.length - 1), // 2,
      optionsSelected: true,
    });

    wrapper.find(`[data-test-subj="sourcerer-reset"]`).first().simulate('click');
    expect(checkOptionsAndSelections(wrapper, patternList)).toEqual({
      availableOptionCount: title.split(',').length - patternList.length, // 1,
      optionsSelected: true,
    });
  });
  it('disables saving when no index patterns are selected', () => {
    store = createStore(
      {
        ...state,
        sourcerer: {
          ...state.sourcerer,
          kibanaDataViews: [
            state.sourcerer.defaultDataView,
            { id: '1234', title: 'auditbeat-*', patternList: ['auditbeat-*'] },
          ],
        },
      },
      SUB_PLUGINS_REDUCER,
      kibanaObservable,
      storage
    );
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="sourcerer-trigger"]').first().simulate('click');
    wrapper.find('[data-test-subj="comboBoxClearButton"]').first().simulate('click');
    expect(wrapper.find('[data-test-subj="sourcerer-save"]').first().prop('disabled')).toBeTruthy();
  });
});
