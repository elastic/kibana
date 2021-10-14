/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { isSignalIndex } from '../../store/sourcerer/helpers';
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
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { SecurityPageName } from '../../../../common/constants';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn(),
}));

const defaultProps = {
  scope: sourcererModel.SourcererScopeName.default,
};

describe('Sourcerer component', () => {
  const state: State = mockGlobalState;
  const { id, patternList, title } = state.sourcerer.defaultDataView;
  const patternListNoSignals = patternList
    .filter((p) => !isSignalIndex(p, state.sourcerer.signalIndexName))
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

  beforeAll(() => {
    (useRouteSpy as jest.Mock).mockImplementation(() => [
      { pageName: SecurityPageName.overview, detailName: undefined },
    ]);
  });

  afterAll(() => {
    (useRouteSpy as jest.Mock).mockImplementation(() => [
      { pageName: SecurityPageName.overview, detailName: undefined },
    ]);
  });

  beforeEach(() => {
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('renders data view title', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    expect(wrapper.find(`[data-test-subj="sourcerer-title"]`).first().text()).toEqual(
      'Data view selection'
    );
  });

  it('renders a toggle for advanced options', () => {
    const testProps = {
      ...defaultProps,
      showAlertsOnlyCheckbox: true,
    };
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...testProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    expect(
      wrapper.find(`[data-test-subj="sourcerer-advanced-options-toggle"]`).first().text()
    ).toEqual('Advanced options');
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
            id: '1234',
            title: 'filebeat-*,auditbeat-*,auditbeat-*,auditbeat-*,auditbeat-*',
            patternList: ['filebeat-*', 'auditbeat-*'],
          },
          kibanaDataViews: [
            {
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
            id: '1234',
            title: 'filebeat-*,auditbeat-*,fakebeat-*',
            patternList: ['filebeat-*', 'auditbeat-*'],
          },
          kibanaDataViews: [
            {
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
  it('onSave dispatches setSelectedDataView', async () => {
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
      availableOptionCount: title.split(',').length - patternListNoSignals.length, // 1,
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
      availableOptionCount: title.split(',').length - (patternListNoSignals.length - 1), // 2,
      optionsSelected: true,
    });

    wrapper.find(`[data-test-subj="sourcerer-reset"]`).first().simulate('click');
    expect(checkOptionsAndSelections(wrapper, patternListNoSignals)).toEqual({
      availableOptionCount: title.split(',').length - patternListNoSignals.length, // 1,
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
  it('Selects a different index pattern', async () => {
    const state2 = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        kibanaDataViews: [
          state.sourcerer.defaultDataView,
          { id: '1234', title: 'fakebeat-*,neatbeat-*', patternList: ['fakebeat-*'] },
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
});

describe('sourcer on alerts page or rules details page', () => {
  let wrapper: ReactWrapper;
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const testProps = {
    scope: sourcererModel.SourcererScopeName.detections,
  };

  beforeAll(() => {
    (useRouteSpy as jest.Mock).mockImplementation(() => [
      { pageName: SecurityPageName.alerts, detailName: undefined },
    ]);

    wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...testProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="sourcerer-advanced-options-toggle"]`).first().simulate('click');
  });

  afterAll(() => {
    (useRouteSpy as jest.Mock).mockImplementation(() => [
      { pageName: SecurityPageName.overview, detailName: undefined },
    ]);
  });

  it('renders an alerts badge in sourcerer button', () => {
    expect(wrapper.find(`[data-test-subj="sourcerer-alerts-badge"]`).first().text()).toEqual(
      'Alerts'
    );
  });

  it('renders a callout', () => {
    expect(wrapper.find(`[data-test-subj="sourcerer-callout"]`).first().text()).toEqual(
      'Data view cannot be modified on this page'
    );
  });

  it('disable data view selector', () => {
    expect(
      wrapper.find(`[data-test-subj="sourcerer-select"]`).first().prop('disabled')
    ).toBeTruthy();
  });

  it('data view selector is default to Security Data View', () => {
    expect(
      wrapper.find(`[data-test-subj="sourcerer-select"]`).first().prop('valueOfSelected')
    ).toEqual('security-solution');
  });

  it('renders an alert badge in data view selector', () => {
    expect(wrapper.find(`[data-test-subj="security-alerts-option-badge"]`).first().text()).toEqual(
      'Alerts'
    );
  });

  it('disable index pattern selector', () => {
    expect(
      wrapper.find(`[data-test-subj="sourcerer-combo-box"]`).first().prop('disabled')
    ).toBeTruthy();
  });

  it('shows signal index as index pettern option', () => {
    expect(wrapper.find(`[data-test-subj="sourcerer-combo-box"]`).first().prop('options')).toEqual([
      { disabled: false, label: '.siem-signals-spacename', value: '.siem-signals-spacename' },
    ]);
  });

  it('does not render reset button', () => {
    expect(wrapper.find(`[data-test-subj="sourcerer-reset"]`).exists()).toBeFalsy();
  });

  it('does not render save button', () => {
    expect(wrapper.find(`[data-test-subj="sourcerer-save"]`).exists()).toBeFalsy();
  });
});

describe('timeline sourcer', () => {
  let wrapper: ReactWrapper;
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const testProps = {
    scope: sourcererModel.SourcererScopeName.timeline,
  };

  beforeAll(() => {
    (useRouteSpy as jest.Mock).mockImplementation(() => [
      { pageName: SecurityPageName.alerts, detailName: undefined },
    ]);

    wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...testProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="timeline-sourcerer-trigger"]`).first().simulate('click');
    wrapper
      .find(
        `[data-test-subj="timeline-sourcerer-popover"] [data-test-subj="sourcerer-advanced-options-toggle"]`
      )
      .first()
      .simulate('click');
  });

  afterAll(() => {
    (useRouteSpy as jest.Mock).mockImplementation(() => [
      { pageName: SecurityPageName.overview, detailName: undefined },
    ]);
  });

  it('renders "alerts only" checkbox', () => {
    wrapper
      .find(
        `[data-test-subj="timeline-sourcerer-popover"] [data-test-subj="sourcerer-alert-only-checkbox"]`
      )
      .first()
      .simulate('click');
    expect(wrapper.find(`[data-test-subj="sourcerer-alert-only-checkbox"]`).first().text()).toEqual(
      'Show only detection alerts'
    );
  });

  it('data view selector is enabled', () => {
    expect(
      wrapper
        .find(`[data-test-subj="timeline-sourcerer-popover"] [data-test-subj="sourcerer-select"]`)
        .first()
        .prop('disabled')
    ).toBeFalsy();
  });

  it('data view selector is default to Security Default Data View', () => {
    expect(
      wrapper
        .find(`[data-test-subj="timeline-sourcerer-popover"] [data-test-subj="sourcerer-select"]`)
        .first()
        .prop('valueOfSelected')
    ).toEqual('security-solution');
  });

  it('index pattern selector is enabled', () => {
    expect(
      wrapper
        .find(
          `[data-test-subj="timeline-sourcerer-popover"] [data-test-subj="sourcerer-combo-box"]`
        )
        .first()
        .prop('disabled')
    ).toBeFalsy();
  });

  it('render reset button', () => {
    expect(wrapper.find(`[data-test-subj="sourcerer-reset"]`).exists()).toBeTruthy();
  });

  it('render save button', () => {
    expect(wrapper.find(`[data-test-subj="sourcerer-save"]`).exists()).toBeTruthy();
  });
});
