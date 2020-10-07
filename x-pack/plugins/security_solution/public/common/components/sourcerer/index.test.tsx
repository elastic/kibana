/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { SourcererComponent } from './index';
import { DEFAULT_INDEX_PATTERN } from '../../../../common/constants';
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
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { waitFor } from '@testing-library/react';

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
  { label: 'winlogbeat-*', value: 'winlogbeat-*' },
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
      wrapper.find(`[data-test-subj="indexPattern-switcher"]`).first().prop('selectedOptions')
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
      wrapper.find(`[data-test-subj="indexPattern-switcher"]`).first().prop('selectedOptions')
    ).toEqual([mockOptions[0]]);
  });
  it('onChange calls updateSourcererScopeIndices', async () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <SourcererComponent {...defaultProps} />
      </TestProviders>
    );
    expect(true).toBeTruthy();
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');

    await waitFor(() => {
      ((wrapper.find(EuiComboBox).props() as unknown) as {
        onChange: (a: EuiComboBoxOptionOption[]) => void;
      }).onChange([mockOptions[0], mockOptions[1]]);
      wrapper.update();
    });
    wrapper.find(`[data-test-subj="add-index"]`).first().simulate('click');

    expect(mockDispatch).toHaveBeenCalledWith(
      sourcererActions.setSelectedIndexPatterns({
        id: SourcererScopeName.default,
        selectedPatterns: [mockOptions[0].value, mockOptions[1].value],
      })
    );
  });
});
