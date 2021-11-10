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
import { EuiSuperSelectOption } from '@elastic/eui/src/components/form/super_select/super_select_control';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const mockOptions = [
  { label: 'apm-*-transaction*', value: 'apm-*-transaction*' },
  { label: 'auditbeat-*', value: 'auditbeat-*' },
  { label: 'endgame-*', value: 'endgame-*' },
  { label: 'filebeat-*', value: 'filebeat-*' },
  { label: 'logs-*', value: 'logs-*' },
  { label: 'packetbeat-*', value: 'packetbeat-*' },
  { label: 'traces-apm*', value: 'traces-apm*' },
  { label: 'winlogbeat-*', value: 'winlogbeat-*' },
];

const defaultProps = {
  scope: sourcererModel.SourcererScopeName.default,
};

describe('Sourcerer component', () => {
  const state: State = mockGlobalState;
  const { id, patternList, title } = state.sourcerer.defaultDataView;
  const patternListNoSignals = patternList
    .filter((p) => p !== state.sourcerer.signalIndexName)
    .sort();
  const checkOptionsAndSelections = (wrapper: ReactWrapper, patterns: string[]) => ({
    availableOptionCount: wrapper.find(`[data-test-subj="sourcerer-combo-option"]`).length,
    optionsSelected: patterns.every((pattern) =>
      wrapper
        .find(`[data-test-subj="sourcerer-combo-box"] span[title="${pattern}"]`)
        .first()
        .exists()
    ),
  });

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('renders tooltip', () => {
    const wrapper = mount(
      <TestProviders>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="sourcerer-tooltip"]').prop('content')).toEqual(
      mockOptions
        .map((p) => p.label)
        .sort()
        .join(', ')
    );
  });

  it('renders popover button inside tooltip', () => {
    const wrapper = mount(
      <TestProviders>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="sourcerer-tooltip"] [data-test-subj="sourcerer-trigger"]')
        .exists()
    ).toBeTruthy();
  });

  // Using props callback instead of simulating clicks,
  // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
  it('Mounts with all options selected', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    expect(
      wrapper.find(`[data-test-subj="sourcerer-combo-box"]`).first().prop('selectedOptions')
    ).toEqual(
      patternListNoSignals.map((p) => ({
        label: p,
        value: p,
      }))
    );
  });
  it('Removes duplicate options from title', () => {
    store = createStore(
      {
        ...state,
        sourcerer: {
          ...state.sourcerer,
          defaultDataView: {
            ...state.sourcerer.defaultDataView,
            id: '1234',
            title: 'filebeat-*,auditbeat-*,auditbeat-*,auditbeat-*,auditbeat-*',
            patternList: ['filebeat-*', 'auditbeat-*'],
          },
          kibanaDataViews: [
            {
              ...state.sourcerer.defaultDataView,
              id: '1234',
              title: 'filebeat-*,auditbeat-*,auditbeat-*,auditbeat-*,auditbeat-*',
              patternList: ['filebeat-*', 'auditbeat-*'],
            },
          ],
          sourcererScopes: {
            ...state.sourcerer.sourcererScopes,
            [SourcererScopeName.default]: {
              ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
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
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    wrapper
      .find(`[data-test-subj="sourcerer-combo-box"] [data-test-subj="comboBoxToggleListButton"]`)
      .first()
      .simulate('click');
    const options: Array<EuiSuperSelectOption<string>> = wrapper
      .find(`[data-test-subj="sourcerer-combo-box"]`)
      .first()
      .prop('options');
    expect(options.length).toEqual(2);
  });
  it('Disables options with no data', () => {
    store = createStore(
      {
        ...state,
        sourcerer: {
          ...state.sourcerer,
          defaultDataView: {
            ...state.sourcerer.defaultDataView,
            id: '1234',
            title: 'filebeat-*,auditbeat-*,fakebeat-*',
            patternList: ['filebeat-*', 'auditbeat-*'],
          },
          kibanaDataViews: [
            {
              ...state.sourcerer.defaultDataView,
              id: '1234',
              title: 'filebeat-*,auditbeat-*,fakebeat-*',
              patternList: ['filebeat-*', 'auditbeat-*'],
            },
          ],
          sourcererScopes: {
            ...state.sourcerer.sourcererScopes,
            [SourcererScopeName.default]: {
              ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
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
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    wrapper
      .find(`[data-test-subj="sourcerer-combo-box"] [data-test-subj="comboBoxToggleListButton"]`)
      .first()
      .simulate('click');
    const options: Array<EuiSuperSelectOption<string>> = wrapper
      .find(`[data-test-subj="sourcerer-combo-box"]`)
      .first()
      .prop('options');
    const disabledOption = options.find((o) => o.disabled);
    expect(disabledOption?.value).toEqual('fakebeat-*');
  });
  it('Mounts with multiple options selected - default', () => {
    const state2 = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        kibanaDataViews: [
          state.sourcerer.defaultDataView,
          {
            ...state.sourcerer.defaultDataView,
            id: '1234',
            title: 'auditbeat-*',
            patternList: ['auditbeat-*'],
          },
          {
            ...state.sourcerer.defaultDataView,
            id: '12347',
            title: 'packetbeat-*',
            patternList: ['packetbeat-*'],
          },
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
      // should hide signal index
      availableOptionCount: title.split(',').length - 3,
      optionsSelected: true,
    });
  });
  it('Mounts with multiple options selected - timeline', () => {
    const state2 = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        kibanaDataViews: [
          state.sourcerer.defaultDataView,
          {
            ...state.sourcerer.defaultDataView,
            id: '1234',
            title: 'auditbeat-*',
            patternList: ['auditbeat-*'],
          },
          {
            ...state.sourcerer.defaultDataView,
            id: '12347',
            title: 'packetbeat-*',
            patternList: ['packetbeat-*'],
          },
        ],
        sourcererScopes: {
          ...mockGlobalState.sourcerer.sourcererScopes,
          [SourcererScopeName.timeline]: {
            ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
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
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="comboBoxInput"]`).first().simulate('click');
    expect(checkOptionsAndSelections(wrapper, patternList.slice(0, 2))).toEqual({
      // should show every option except fakebeat-*
      availableOptionCount: title.split(',').length - 2,
      optionsSelected: true,
    });
  });
  it('onSave dispatches setSelectedDataView', async () => {
    store = createStore(
      {
        ...state,
        sourcerer: {
          ...state.sourcerer,
          kibanaDataViews: [
            state.sourcerer.defaultDataView,
            {
              ...state.sourcerer.defaultDataView,
              id: '1234',
              title: 'filebeat-*',
              patternList: ['filebeat-*'],
            },
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
      availableOptionCount: title.split(',').length - 3,
      optionsSelected: true,
    });

    wrapper.find(`[data-test-subj="sourcerer-combo-option"]`).first().simulate('click');
    expect(checkOptionsAndSelections(wrapper, patternList.slice(0, 3))).toEqual({
      availableOptionCount: title.split(',').length - 4,
      optionsSelected: true,
    });
    wrapper.find(`[data-test-subj="sourcerer-save"]`).first().simulate('click');
    expect(wrapper.find(`[data-test-subj="sourcerer-popover"]`).first().prop('isOpen')).toBeFalsy();

    expect(mockDispatch).toHaveBeenCalledWith(
      sourcererActions.setSelectedDataView({
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

    expect(checkOptionsAndSelections(wrapper, patternListNoSignals)).toEqual({
      availableOptionCount: 1,
      optionsSelected: true,
    });

    wrapper
      .find(
        `[data-test-subj="sourcerer-combo-box"] [title="${patternList[0]}"] button.euiBadge__iconButton`
      )
      .first()
      .simulate('click');
    expect(
      checkOptionsAndSelections(wrapper, patternListNoSignals.slice(1, patternListNoSignals.length))
    ).toEqual({
      availableOptionCount: 2,
      optionsSelected: true,
    });

    wrapper.find(`[data-test-subj="sourcerer-reset"]`).first().simulate('click');
    expect(checkOptionsAndSelections(wrapper, patternListNoSignals)).toEqual({
      availableOptionCount: 1,
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
            {
              ...state.sourcerer.defaultDataView,
              id: '1234',
              title: 'auditbeat-*',
              patternList: ['auditbeat-*'],
            },
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
  it('Selects a different index pattern', async () => {
    const state2 = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        kibanaDataViews: [
          state.sourcerer.defaultDataView,
          {
            ...state.sourcerer.defaultDataView,
            id: '1234',
            title: 'fakebeat-*,neatbeat-*',
            patternList: ['fakebeat-*'],
          },
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
    wrapper.find(`button[data-test-subj="sourcerer-select"]`).first().simulate('click');

    wrapper.find(`[data-test-subj="dataView-option-super"]`).first().simulate('click');
    expect(checkOptionsAndSelections(wrapper, ['fakebeat-*'])).toEqual({
      availableOptionCount: 0,
      optionsSelected: true,
    });
    wrapper.find(`[data-test-subj="sourcerer-save"]`).first().simulate('click');

    expect(mockDispatch).toHaveBeenCalledWith(
      sourcererActions.setSelectedDataView({
        id: SourcererScopeName.default,
        selectedDataViewId: '1234',
        selectedPatterns: ['fakebeat-*'],
      })
    );
  });
  it('Does display signals index on timeline sourcerer', () => {
    const state2 = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        kibanaDataViews: [
          state.sourcerer.defaultDataView,
          {
            ...state.sourcerer.defaultDataView,
            id: '1234',
            title: 'auditbeat-*',
            patternList: ['auditbeat-*'],
          },
          {
            ...state.sourcerer.defaultDataView,
            id: '12347',
            title: 'packetbeat-*',
            patternList: ['packetbeat-*'],
          },
        ],
        sourcererScopes: {
          ...mockGlobalState.sourcerer.sourcererScopes,
          [SourcererScopeName.timeline]: {
            ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
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
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="comboBoxToggleListButton"]`).first().simulate('click');
    expect(wrapper.find(`[data-test-subj="sourcerer-combo-option"]`).at(6).text()).toEqual(
      mockGlobalState.sourcerer.signalIndexName
    );
  });
  it('Does not display signals index on default sourcerer', () => {
    const state2 = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        kibanaDataViews: [
          state.sourcerer.defaultDataView,
          {
            ...state.sourcerer.defaultDataView,
            id: '1234',
            title: 'auditbeat-*',
            patternList: ['auditbeat-*'],
          },
          {
            ...state.sourcerer.defaultDataView,
            id: '12347',
            title: 'packetbeat-*',
            patternList: ['packetbeat-*'],
          },
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
    expect(
      wrapper
        .find(
          `[data-test-subj="sourcerer-combo-box"] span[title="${mockGlobalState.sourcerer.signalIndexName}"]`
        )
        .first()
        .exists()
    ).toBeFalsy();
  });
});
