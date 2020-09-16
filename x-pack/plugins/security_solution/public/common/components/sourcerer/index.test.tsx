/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { SourcererComponent } from './index';
import * as i18n from './translations';
import { ADD_INDEX_PATH, DEFAULT_INDEX_PATTERN } from '../../../../common/constants';
import { sourcererActions, sourcererModel } from '../../store/sourcerer';
import {
  apolloClientObservable,
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

const mockOptions = [
  {
    label: 'apm-*-transaction*',
    key: 'apm-*-transaction*-0',
    value: 'apm-*-transaction*',
    checked: 'on',
  },
  { label: 'auditbeat-*', key: 'auditbeat-*-1', value: 'auditbeat-*', checked: 'on' },
  { label: 'endgame-*', key: 'endgame-*-2', value: 'endgame-*', checked: 'on' },
  { label: 'filebeat-*', key: 'filebeat-*-3', value: 'filebeat-*', checked: 'on' },
  { label: 'logs-*', key: 'logs-*-4', value: 'logs-*', checked: 'on' },
  { label: 'packetbeat-*', key: 'packetbeat-*-5', value: 'packetbeat-*', checked: 'on' },
  { label: 'winlogbeat-*', key: 'winlogbeat-*-6', value: 'winlogbeat-*', checked: 'on' },
];

const defaultProps = {
  scope: sourcererModel.SourcererScopeName.default,
};
describe('Sourcerer component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  let store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  );

  beforeEach(() => {
    store = createStore(
      state,
      SUB_PLUGINS_REDUCER,
      apolloClientObservable,
      kibanaObservable,
      storage
    );
  });

  // Using props callback instead of simulating clicks,
  // because EuiSelectable uses a virtualized list, which isn't easily testable via test subjects
  it('Mounts with all options selected', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <SourcererComponent {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    expect(
      wrapper.find(`[data-test-subj="indexPattern-switcher"]`).first().prop('options')
    ).toEqual(mockOptions);
  });
  it('Mounts with some options selected', () => {
    const state2 = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        sourcererScopes: {
          ...mockGlobalState.sourcerer.sourcererScopes,
          [SourcererScopeName.default]: {
            ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
            loading: false,
            selectedPatterns: [DEFAULT_INDEX_PATTERN[0]],
          },
        },
      },
    };

    store = createStore(
      state2,
      SUB_PLUGINS_REDUCER,
      apolloClientObservable,
      kibanaObservable,
      storage
    );
    const wrapper = mount(
      <TestProviders store={store}>
        <SourcererComponent {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    expect(
      wrapper.find(`[data-test-subj="indexPattern-switcher"]`).first().prop('options')
    ).toEqual(mockOptions.map((o, i) => (i === 0 ? o : { ...o, checked: undefined })));
  });
  it('onChange calls updateSourcererScopeIndices', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <SourcererComponent {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');

    const switcherOnChange = wrapper
      .find(`[data-test-subj="indexPattern-switcher"]`)
      .first()
      .prop('onChange');
    // @ts-ignore
    switcherOnChange([mockOptions[0], mockOptions[1]]);
    expect(mockDispatch).toHaveBeenCalledWith(
      sourcererActions.setSelectedIndexPatterns({
        id: SourcererScopeName.default,
        selectedPatterns: [mockOptions[0].value, mockOptions[1].value],
      })
    );
  });
  it('Disabled options have icon tooltip', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <SourcererComponent {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    // @ts-ignore
    const Rendered = wrapper
      .find(`[data-test-subj="indexPattern-switcher"]`)
      .first()
      .prop('renderOption')(
      {
        label: 'blobbeat-*',
        key: 'blobbeat-*-1',
        value: 'blobbeat-*',
        disabled: true,
        checked: undefined,
      },
      ''
    );
    expect(Rendered.props.children[1].props.content).toEqual(i18n.DISABLED_INDEX_PATTERNS);
  });

  it('Button links to index path', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <SourcererComponent {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');

    expect(wrapper.find(`[data-test-subj="add-index"]`).first().prop('href')).toEqual(
      ADD_INDEX_PATH
    );
  });
});
