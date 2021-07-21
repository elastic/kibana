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
import { getPatternList } from '../../store/sourcerer/helpers';

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
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  const state: State = mockGlobalState;
  const defaultAsList = getPatternList(state.sourcerer.defaultIndexPattern);
  const checkOptionsAndSelections = (wrapper: ReactWrapper, patterns: string[]) => {
    return {
      availableOptionCount: wrapper.find(`[data-test-subj="kip-option"]`).length,
      optionsSelected: patterns.every((pattern) =>
        wrapper
          .find(`[data-test-subj="indexPattern-switcher"] span[title="${pattern}"]`)
          .first()
          .exists()
      ),
    };
  };

  const mockOptions = [
    {
      label: state.sourcerer.defaultIndexPattern.title,
      value: state.sourcerer.defaultIndexPattern.title,
    },
    {
      label: 'filebeat-*',
      value: 'filebeat-*',
    },
  ];

  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  it('Mounts with all options selected', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    expect(
      wrapper.find(`[data-test-subj="indexPattern-switcher"]`).first().prop('selectedOptions')
    ).toEqual([mockOptions[0]]);
  });
  it('Mounts with multiple options selected', () => {
    const state2 = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        kibanaIndexPatterns: [
          state.sourcerer.defaultIndexPattern,
          { id: '1234', title: 'auditbeat-*' },
          { id: '1234', title: 'packetbeat-*' },
        ],
        sourcererScopes: {
          ...mockGlobalState.sourcerer.sourcererScopes,
          [SourcererScopeName.default]: {
            ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
            loading: false,
            selectedPatterns: [...defaultAsList, 'auditbeat-*'],
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
      checkOptionsAndSelections(wrapper, ['auditbeat-*', state.sourcerer.defaultIndexPattern.title])
    ).toEqual({
      availableOptionCount: 1,
      optionsSelected: true,
    });
  });
  it('onChange calls updateSourcererScopeIndices', async () => {
    store = createStore(
      {
        ...state,
        sourcerer: {
          ...state.sourcerer,
          kibanaIndexPatterns: [
            state.sourcerer.defaultIndexPattern,
            { id: '1234', title: 'filebeat-*' },
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
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="comboBoxInput"]`).first().simulate('click');
    expect(checkOptionsAndSelections(wrapper, [state.sourcerer.defaultIndexPattern.title])).toEqual(
      {
        availableOptionCount: 1,
        optionsSelected: true,
      }
    );

    wrapper.find(`[data-test-subj="kip-option"]`).first().simulate('click');
    expect(
      checkOptionsAndSelections(wrapper, [mockOptions[0].label, mockOptions[1].label])
    ).toEqual({
      availableOptionCount: 0,
      optionsSelected: true,
    });
    wrapper.find(`[data-test-subj="add-index"]`).first().simulate('click');
    expect(wrapper.find(`[data-test-subj="sourcerer-popover"]`).first().prop('isOpen')).toBeFalsy();

    expect(mockDispatch).toHaveBeenCalledWith(
      sourcererActions.setSelectedIndexPatterns({
        id: SourcererScopeName.default,
        selectedPatterns: [mockOptions[0].value, mockOptions[1].value],
      })
    );
  });
  it('resets to default index pattern', async () => {
    store = createStore(
      {
        ...state,
        sourcerer: {
          ...state.sourcerer,
          kibanaIndexPatterns: [
            state.sourcerer.defaultIndexPattern,
            { id: '1234', title: 'auditbeat-*' },
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
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="comboBoxInput"]`).first().simulate('click');

    expect(checkOptionsAndSelections(wrapper, [state.sourcerer.defaultIndexPattern.title])).toEqual(
      {
        availableOptionCount: 1,
        optionsSelected: true,
      }
    );
    wrapper
      .find(
        `[data-test-subj="indexPattern-switcher"] [title="${defaultAsList}"] button.euiBadge__iconButton`
      )
      .first()
      .simulate('click');
    expect(checkOptionsAndSelections(wrapper, [state.sourcerer.defaultIndexPattern.title])).toEqual(
      {
        availableOptionCount: 2,
        optionsSelected: false,
      }
    );

    wrapper.find(`[data-test-subj="sourcerer-reset"]`).first().simulate('click');
    expect(checkOptionsAndSelections(wrapper, [state.sourcerer.defaultIndexPattern.title])).toEqual(
      {
        availableOptionCount: 1,
        optionsSelected: true,
      }
    );
  });
  it('disables saving when no index patterns are selected', () => {
    store = createStore(
      {
        ...state,
        sourcerer: {
          ...state.sourcerer,
          kibanaIndexPatterns: [
            state.sourcerer.defaultIndexPattern,
            { id: '1234', title: 'auditbeat-*' },
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
    expect(wrapper.find('[data-test-subj="add-index"]').first().prop('disabled')).toBeTruthy();
  });
});
