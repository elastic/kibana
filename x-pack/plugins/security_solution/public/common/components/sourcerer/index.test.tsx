/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import { cloneDeep } from 'lodash';

import { initialSourcererState, SourcererScopeName } from '../../store/sourcerer/model';
import { Sourcerer } from '.';
import { sourcererActions, sourcererModel } from '../../store/sourcerer';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../mock';
import { createStore } from '../../store';
import type { EuiSuperSelectOption } from '@elastic/eui/src/components/form/super_select/super_select_control';
import { waitFor } from '@testing-library/react';
import { useSourcererDataView } from '../../containers/sourcerer';
import { useSignalHelpers } from '../../containers/sourcerer/use_signal_helpers';
import { TimelineId } from '../../../../common/types/timeline';
import { TimelineType } from '../../../../common/api/timeline';
import { DEFAULT_INDEX_PATTERN } from '../../../../common/constants';
import { sortWithExcludesAtEnd } from '../../../../common/utils/sourcerer';

const mockDispatch = jest.fn();

jest.mock('../../containers/sourcerer');
jest.mock('../../containers/sourcerer/use_signal_helpers');
const mockUseUpdateDataView = jest.fn().mockReturnValue(() => true);
jest.mock('./use_update_data_view', () => ({
  useUpdateDataView: () => mockUseUpdateDataView,
}));
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');

  return {
    ...original,
    toMountPoint: jest.fn(),
  };
});

const mockUpdateUrlParam = jest.fn();
jest.mock('../../utils/global_query_string', () => {
  const original = jest.requireActual('../../utils/global_query_string');

  return {
    ...original,
    useUpdateUrlParam: () => mockUpdateUrlParam,
  };
});

const mockOptions = DEFAULT_INDEX_PATTERN.map((index) => ({ label: index, value: index }));

const defaultProps = {
  scope: sourcererModel.SourcererScopeName.default,
};

const checkOptionsAndSelections = (wrapper: ReactWrapper, patterns: string[]) => ({
  availableOptionCount:
    wrapper.find('List').length > 0 ? wrapper.find('List').prop('itemCount') : 0,
  optionsSelected: patterns.every((pattern) =>
    wrapper.find(`[data-test-subj="sourcerer-combo-box"] span[title="${pattern}"]`).first().exists()
  ),
});

const { id, patternList, title } = mockGlobalState.sourcerer.defaultDataView;
const patternListNoSignals = sortWithExcludesAtEnd(
  patternList.filter((p) => p !== mockGlobalState.sourcerer.signalIndexName)
);
let store: ReturnType<typeof createStore>;
const sourcererDataView = {
  indicesExist: true,
  loading: false,
};

describe('Sourcerer component', () => {
  const { storage } = createSecuritySolutionStorageMock();
  const pollForSignalIndexMock = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    (useSourcererDataView as jest.Mock).mockReturnValue(sourcererDataView);
    (useSignalHelpers as jest.Mock).mockReturnValue({ signalIndexNeedsInit: false });
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

  it('renders tooltip', () => {
    const wrapper = mount(
      <TestProviders>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="sourcerer-tooltip"]').prop('content')).toEqual(
      sortWithExcludesAtEnd(mockOptions.map((p) => p.label)).join(', ')
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
        ...mockGlobalState,
        sourcerer: {
          ...mockGlobalState.sourcerer,
          defaultDataView: {
            ...mockGlobalState.sourcerer.defaultDataView,
            id: '1234',
            title: 'filebeat-*,auditbeat-*,fakebeat-*',
            patternList: ['filebeat-*', 'auditbeat-*'],
          },
          kibanaDataViews: [
            {
              ...mockGlobalState.sourcerer.defaultDataView,
              id: '1234',
              title: 'filebeat-*,auditbeat-*,fakebeat-*',
              patternList: ['filebeat-*', 'auditbeat-*'],
            },
          ],
          sourcererScopes: {
            ...mockGlobalState.sourcerer.sourcererScopes,
            [SourcererScopeName.default]: {
              ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
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
          mockGlobalState.sourcerer.defaultDataView,
          {
            ...mockGlobalState.sourcerer.defaultDataView,
            id: '1234',
            title: 'auditbeat-*',
            patternList: ['auditbeat-*'],
          },
          {
            ...mockGlobalState.sourcerer.defaultDataView,
            id: '12347',
            title: 'packetbeat-*',
            patternList: ['packetbeat-*'],
          },
        ],
        sourcererScopes: {
          ...mockGlobalState.sourcerer.sourcererScopes,
          [SourcererScopeName.default]: {
            ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
            selectedDataViewId: id,
            selectedPatterns: patternListNoSignals.slice(0, 2),
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
    expect(checkOptionsAndSelections(wrapper, patternListNoSignals.slice(0, 2))).toEqual({
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
          mockGlobalState.sourcerer.defaultDataView,
          {
            ...mockGlobalState.sourcerer.defaultDataView,
            id: '1234',
            title: 'auditbeat-*',
            patternList: ['auditbeat-*'],
          },
          {
            ...mockGlobalState.sourcerer.defaultDataView,
            id: '12347',
            title: 'packetbeat-*',
            patternList: ['packetbeat-*'],
          },
        ],
        sourcererScopes: {
          ...mockGlobalState.sourcerer.sourcererScopes,
          [SourcererScopeName.timeline]: {
            ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
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
    wrapper.find(`[data-test-subj="timeline-sourcerer-trigger"]`).first().simulate('click');
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
        ...mockGlobalState,
        sourcerer: {
          ...mockGlobalState.sourcerer,
          kibanaDataViews: [
            mockGlobalState.sourcerer.defaultDataView,
            {
              ...mockGlobalState.sourcerer.defaultDataView,
              id: '1234',
              title: 'filebeat-*',
              patternList: ['filebeat-*'],
            },
          ],
          sourcererScopes: {
            ...mockGlobalState.sourcerer.sourcererScopes,
            [SourcererScopeName.default]: {
              ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
              selectedDataViewId: id,
              selectedPatterns: patternListNoSignals.slice(0, 2),
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
    expect(checkOptionsAndSelections(wrapper, patternListNoSignals.slice(0, 2))).toEqual({
      availableOptionCount: title.split(',').length - 3,
      optionsSelected: true,
    });
    wrapper.find(`[data-test-subj="sourcerer-combo-option"]`).first().simulate('click');
    expect(checkOptionsAndSelections(wrapper, patternListNoSignals.slice(0, 3))).toEqual({
      availableOptionCount: title.split(',').length - 4,
      optionsSelected: true,
    });
    wrapper.find(`button[data-test-subj="sourcerer-save"]`).first().simulate('click');
    expect(wrapper.find(`[data-test-subj="sourcerer-popover"]`).first().prop('isOpen')).toBeFalsy();

    expect(mockDispatch).toHaveBeenCalledWith(
      sourcererActions.setSelectedDataView({
        id: SourcererScopeName.default,
        selectedDataViewId: id,
        selectedPatterns: patternListNoSignals.slice(0, 3),
      })
    );
  });

  it('onSave updates the URL param', () => {
    store = createStore(
      {
        ...mockGlobalState,
        sourcerer: {
          ...mockGlobalState.sourcerer,
          kibanaDataViews: [
            mockGlobalState.sourcerer.defaultDataView,
            {
              ...mockGlobalState.sourcerer.defaultDataView,
              id: '1234',
              title: 'filebeat-*',
              patternList: ['filebeat-*'],
            },
          ],
          sourcererScopes: {
            ...mockGlobalState.sourcerer.sourcererScopes,
            [SourcererScopeName.default]: {
              ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.default],
              selectedDataViewId: id,
              selectedPatterns: patternListNoSignals.slice(0, 2),
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
    wrapper.find(`[data-test-subj="sourcerer-combo-option"]`).first().simulate('click');
    wrapper.find(`button[data-test-subj="sourcerer-save"]`).first().simulate('click');

    expect(mockUpdateUrlParam).toHaveBeenCalledTimes(1);
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
        `[data-test-subj="sourcerer-combo-box"] [title="${patternListNoSignals[0]}"] button.euiBadge__iconButton`
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
        ...mockGlobalState,
        sourcerer: {
          ...mockGlobalState.sourcerer,
          kibanaDataViews: [
            mockGlobalState.sourcerer.defaultDataView,
            {
              ...mockGlobalState.sourcerer.defaultDataView,
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
  it('Does display signals index on timeline sourcerer', () => {
    const state2 = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        kibanaDataViews: [
          mockGlobalState.sourcerer.defaultDataView,
          {
            ...mockGlobalState.sourcerer.defaultDataView,
            id: '1234',
            title: 'auditbeat-*',
            patternList: ['auditbeat-*'],
          },
          {
            ...mockGlobalState.sourcerer.defaultDataView,
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
            selectedDataViewId: id,
            selectedPatterns: patternListNoSignals.slice(0, 2),
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
    wrapper.find(`[data-test-subj="timeline-sourcerer-trigger"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="comboBoxToggleListButton"]`).first().simulate('click');
    expect(wrapper.find(`[data-test-subj="sourcerer-combo-option"]`).at(0).text()).toEqual(
      mockGlobalState.sourcerer.signalIndexName
    );
  });
  it('Does not display signals index on default sourcerer', () => {
    const state2 = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        kibanaDataViews: [
          mockGlobalState.sourcerer.defaultDataView,
          {
            ...mockGlobalState.sourcerer.defaultDataView,
            id: '1234',
            title: 'auditbeat-*',
            patternList: ['auditbeat-*'],
          },
          {
            ...mockGlobalState.sourcerer.defaultDataView,
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
            selectedDataViewId: id,
            selectedPatterns: patternListNoSignals.slice(0, 2),
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

  it('does not poll for signals index if pollForSignalIndex is not defined', () => {
    (useSignalHelpers as jest.Mock).mockReturnValue({
      signalIndexNeedsInit: false,
    });

    mount(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );

    expect(pollForSignalIndexMock).toHaveBeenCalledTimes(0);
  });

  it('does not poll for signals index if it does not exist and scope is default', () => {
    (useSignalHelpers as jest.Mock).mockReturnValue({
      pollForSignalIndex: pollForSignalIndexMock,
      signalIndexNeedsInit: false,
    });

    mount(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.default} />
      </TestProviders>
    );

    expect(pollForSignalIndexMock).toHaveBeenCalledTimes(0);
  });

  it('polls for signals index if it does not exist and scope is timeline', () => {
    (useSignalHelpers as jest.Mock).mockReturnValue({
      pollForSignalIndex: pollForSignalIndexMock,
      signalIndexNeedsInit: false,
    });

    mount(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );
    expect(pollForSignalIndexMock).toHaveBeenCalledTimes(1);
  });

  it('polls for signals index if it does not exist and scope is detections', () => {
    (useSignalHelpers as jest.Mock).mockReturnValue({
      pollForSignalIndex: pollForSignalIndexMock,
      signalIndexNeedsInit: false,
    });

    mount(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.detections} />
      </TestProviders>
    );
    expect(pollForSignalIndexMock).toHaveBeenCalledTimes(1);
  });
});

describe('sourcerer on alerts page or rules details page', () => {
  let wrapper: ReactWrapper;
  const { storage } = createSecuritySolutionStorageMock();
  store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const testProps = {
    scope: sourcererModel.SourcererScopeName.detections,
  };

  beforeAll(() => {
    wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...testProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="sourcerer-advanced-options-toggle"]`).first().simulate('click');
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

  it('shows signal index as index pattern option', () => {
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

describe('timeline sourcerer', () => {
  let wrapper: ReactWrapper;
  const { storage } = createSecuritySolutionStorageMock();
  store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const testProps = {
    scope: sourcererModel.SourcererScopeName.timeline,
  };

  beforeAll(() => {
    (useSourcererDataView as jest.Mock).mockReturnValue(sourcererDataView);
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

  it('renders "alerts only" checkbox, unchecked', () => {
    wrapper
      .find(
        `[data-test-subj="timeline-sourcerer-popover"] [data-test-subj="sourcerer-alert-only-checkbox"]`
      )
      .first()
      .simulate('click');
    expect(wrapper.find(`[data-test-subj="sourcerer-alert-only-checkbox"]`).first().text()).toEqual(
      'Show only detection alerts'
    );
    expect(
      wrapper.find(`[data-test-subj="sourcerer-alert-only-checkbox"] input`).first().prop('checked')
    ).toEqual(false);
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

  it('Checks box when only alerts index is selected in timeline', () => {
    const state2 = {
      ...mockGlobalState,
      sourcerer: {
        ...mockGlobalState.sourcerer,
        sourcererScopes: {
          ...mockGlobalState.sourcerer.sourcererScopes,
          [SourcererScopeName.timeline]: {
            ...mockGlobalState.sourcerer.sourcererScopes[SourcererScopeName.timeline],
            loading: false,
            selectedDataViewId: id,
            selectedPatterns: [`${mockGlobalState.sourcerer.signalIndexName}`],
          },
        },
      },
    };

    store = createStore(
      state2,
      SUB_PLUGINS_REDUCER,

      kibanaObservable,
      storage
    );

    wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="timeline-sourcerer-trigger"]`).first().simulate('click');
    expect(
      wrapper.find(`[data-test-subj="sourcerer-alert-only-checkbox"] input`).first().prop('checked')
    ).toEqual(true);
  });
});

describe('Sourcerer integration tests', () => {
  const state = {
    ...mockGlobalState,
    sourcerer: {
      ...mockGlobalState.sourcerer,
      kibanaDataViews: [
        mockGlobalState.sourcerer.defaultDataView,
        {
          ...mockGlobalState.sourcerer.defaultDataView,
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
          selectedDataViewId: id,
          selectedPatterns: patternListNoSignals.slice(0, 2),
        },
      },
    },
  };

  const { storage } = createSecuritySolutionStorageMock();

  beforeEach(() => {
    (useSourcererDataView as jest.Mock).mockReturnValue(sourcererDataView);
    store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    jest.clearAllMocks();
  });

  it('Selects a different index pattern', async () => {
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
    wrapper.find(`button[data-test-subj="sourcerer-save"]`).first().simulate('click');

    expect(mockDispatch).toHaveBeenCalledWith(
      sourcererActions.setSelectedDataView({
        id: SourcererScopeName.default,
        selectedDataViewId: '1234',
        selectedPatterns: ['fakebeat-*'],
      })
    );
  });
});

describe('No data', () => {
  const mockNoIndicesState = {
    ...mockGlobalState,
    sourcerer: {
      ...initialSourcererState,
    },
  };

  const { storage } = createSecuritySolutionStorageMock();

  beforeEach(() => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      indicesExist: false,
    });
    store = createStore(mockNoIndicesState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
    jest.clearAllMocks();
  });

  test('Hide sourcerer - default ', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="sourcerer-trigger"]`).exists()).toEqual(false);
  });
  test('Hide sourcerer - detections ', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.detections} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="sourcerer-trigger"]`).exists()).toEqual(false);
  });
  test('Hide sourcerer - timeline ', () => {
    const wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="timeline-sourcerer-trigger"]`).exists()).toEqual(true);
  });
});

describe('Update available', () => {
  const { storage } = createSecuritySolutionStorageMock();
  const state2 = {
    ...mockGlobalState,
    sourcerer: {
      ...mockGlobalState.sourcerer,
      kibanaDataViews: [
        mockGlobalState.sourcerer.defaultDataView,
        {
          ...mockGlobalState.sourcerer.defaultDataView,
          id: '1234',
          title: 'auditbeat-*',
          patternList: ['auditbeat-*'],
        },
        {
          ...mockGlobalState.sourcerer.defaultDataView,
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
          selectedDataViewId: null,
          selectedPatterns: ['myFakebeat-*'],
          missingPatterns: ['myFakebeat-*'],
        },
      },
    },
  };

  let wrapper: ReactWrapper;

  beforeEach(() => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      activePatterns: ['myFakebeat-*'],
    });
    store = createStore(state2, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

    wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Show Update available label', () => {
    expect(wrapper.find(`[data-test-subj="sourcerer-deprecated-badge"]`).exists()).toBeTruthy();
  });

  test('Show correct tooltip', () => {
    expect(wrapper.find(`[data-test-subj="sourcerer-tooltip"]`).prop('content')).toEqual(
      'myFakebeat-*'
    );
  });

  test('Show UpdateDefaultDataViewModal', () => {
    wrapper.find(`[data-test-subj="timeline-sourcerer-trigger"]`).first().simulate('click');

    wrapper.find(`button[data-test-subj="sourcerer-deprecated-update"]`).first().simulate('click');

    expect(wrapper.find(`UpdateDefaultDataViewModal`).prop('isShowing')).toEqual(true);
  });

  test('Show UpdateDefaultDataViewModal Callout', () => {
    wrapper.find(`[data-test-subj="timeline-sourcerer-trigger"]`).first().simulate('click');

    wrapper.find(`button[data-test-subj="sourcerer-deprecated-update"]`).first().simulate('click');

    expect(wrapper.find(`[data-test-subj="sourcerer-deprecated-callout"]`).first().text()).toEqual(
      'This timeline uses a legacy data view selector'
    );

    expect(
      wrapper.find(`[data-test-subj="sourcerer-current-patterns-message"]`).first().text()
    ).toEqual('The active index patterns in this timeline are: myFakebeat-*');

    expect(wrapper.find(`[data-test-subj="sourcerer-deprecated-message"]`).first().text()).toEqual(
      "We have preserved your timeline by creating a temporary data view. If you'd like to modify your data, we can recreate your temporary data view with the new data view selector. You can also manually select a data view here."
    );
  });

  test('Show Add index pattern in UpdateDefaultDataViewModal', () => {
    wrapper.find(`[data-test-subj="timeline-sourcerer-trigger"]`).first().simulate('click');

    wrapper.find(`button[data-test-subj="sourcerer-deprecated-update"]`).first().simulate('click');

    expect(wrapper.find(`button[data-test-subj="sourcerer-update-data-view"]`).text()).toEqual(
      'Add index pattern'
    );
  });

  test('Set all the index patterns from legacy timeline to sourcerer, after clicking on "Add index pattern"', async () => {
    wrapper.find(`[data-test-subj="timeline-sourcerer-trigger"]`).first().simulate('click');

    wrapper.find(`button[data-test-subj="sourcerer-deprecated-update"]`).first().simulate('click');

    wrapper.find(`button[data-test-subj="sourcerer-update-data-view"]`).simulate('click');

    await waitFor(() => wrapper.update());
    expect(mockDispatch).toHaveBeenCalledWith(
      sourcererActions.setSelectedDataView({
        id: SourcererScopeName.timeline,
        selectedDataViewId: 'security-solution',
        selectedPatterns: ['myFakebeat-*'],
        shouldValidateSelectedPatterns: false,
      })
    );
  });
});

describe('Update available for timeline template', () => {
  const { storage } = createSecuritySolutionStorageMock();
  const state2 = {
    ...mockGlobalState,
    timeline: {
      ...mockGlobalState.timeline,
      timelineById: {
        ...mockGlobalState.timeline.timelineById,
        [TimelineId.active]: {
          ...mockGlobalState.timeline.timelineById.test,
          timelineType: TimelineType.template,
        },
      },
    },
    sourcerer: {
      ...mockGlobalState.sourcerer,
      kibanaDataViews: [
        mockGlobalState.sourcerer.defaultDataView,
        {
          ...mockGlobalState.sourcerer.defaultDataView,
          id: '1234',
          title: 'auditbeat-*',
          patternList: ['auditbeat-*'],
        },
        {
          ...mockGlobalState.sourcerer.defaultDataView,
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
          selectedDataViewId: null,
          selectedPatterns: ['myFakebeat-*'],
          missingPatterns: ['myFakebeat-*'],
        },
      },
    },
  };

  let wrapper: ReactWrapper;

  beforeEach(() => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      activePatterns: ['myFakebeat-*'],
    });
    store = createStore(state2, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

    wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Show UpdateDefaultDataViewModal CallOut', () => {
    wrapper.find(`[data-test-subj="timeline-sourcerer-trigger"]`).first().simulate('click');

    wrapper.find(`button[data-test-subj="sourcerer-deprecated-update"]`).first().simulate('click');

    expect(wrapper.find(`[data-test-subj="sourcerer-deprecated-callout"]`).first().text()).toEqual(
      'This timeline template uses a legacy data view selector'
    );

    expect(wrapper.find(`[data-test-subj="sourcerer-deprecated-message"]`).first().text()).toEqual(
      "We have preserved your timeline template by creating a temporary data view. If you'd like to modify your data, we can recreate your temporary data view with the new data view selector. You can also manually select a data view here."
    );
  });
});

describe('Missing index patterns', () => {
  const { storage } = createSecuritySolutionStorageMock();
  const state2 = {
    ...mockGlobalState,
    timeline: {
      ...mockGlobalState.timeline,
      timelineById: {
        ...mockGlobalState.timeline.timelineById,
        [TimelineId.active]: {
          ...mockGlobalState.timeline.timelineById.test,
          timelineType: TimelineType.template,
        },
      },
    },
    sourcerer: {
      ...mockGlobalState.sourcerer,
      kibanaDataViews: [
        mockGlobalState.sourcerer.defaultDataView,
        {
          ...mockGlobalState.sourcerer.defaultDataView,
          id: '1234',
          title: 'auditbeat-*',
          patternList: ['auditbeat-*'],
        },
        {
          ...mockGlobalState.sourcerer.defaultDataView,
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
          selectedDataViewId: 'fake-data-view-id',
          selectedPatterns: ['myFakebeat-*'],
          missingPatterns: ['myFakebeat-*'],
        },
      },
    },
  };

  let wrapper: ReactWrapper;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Show UpdateDefaultDataViewModal CallOut for timeline', () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      activePatterns: ['myFakebeat-*'],
    });
    const state3 = cloneDeep(state2);
    state3.timeline.timelineById[TimelineId.active].timelineType = TimelineType.default;
    store = createStore(state3, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

    wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="timeline-sourcerer-trigger"]`).first().simulate('click');

    wrapper.find(`button[data-test-subj="sourcerer-deprecated-update"]`).first().simulate('click');

    expect(wrapper.find(`[data-test-subj="sourcerer-deprecated-callout"]`).first().text()).toEqual(
      'This timeline is out of date with the Security Data View'
    );

    expect(
      wrapper.find(`[data-test-subj="sourcerer-current-patterns-message"]`).first().text()
    ).toEqual('The active index patterns in this timeline are: myFakebeat-*');

    expect(
      wrapper.find(`[data-test-subj="sourcerer-missing-patterns-callout"]`).first().text()
    ).toEqual('Security Data View is missing the following index patterns: myFakebeat-*');

    expect(
      wrapper.find(`[data-test-subj="sourcerer-missing-patterns-message"]`).first().text()
    ).toEqual(
      "We have preserved your timeline by creating a temporary data view. If you'd like to modify your data, we can add the missing index patterns to the Security Data View. You can also manually select a data view here."
    );
  });

  test('Show UpdateDefaultDataViewModal CallOut for timeline template', () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      activePatterns: ['myFakebeat-*'],
    });
    store = createStore(state2, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

    wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="timeline-sourcerer-trigger"]`).first().simulate('click');

    wrapper.find(`button[data-test-subj="sourcerer-deprecated-update"]`).first().simulate('click');

    expect(wrapper.find(`[data-test-subj="sourcerer-deprecated-callout"]`).first().text()).toEqual(
      'This timeline template is out of date with the Security Data View'
    );

    expect(
      wrapper.find(`[data-test-subj="sourcerer-current-patterns-message"]`).first().text()
    ).toEqual('The active index patterns in this timeline template are: myFakebeat-*');

    expect(
      wrapper.find(`[data-test-subj="sourcerer-missing-patterns-callout"]`).first().text()
    ).toEqual('Security Data View is missing the following index patterns: myFakebeat-*');

    expect(
      wrapper.find(`[data-test-subj="sourcerer-missing-patterns-message"]`).first().text()
    ).toEqual(
      "We have preserved your timeline template by creating a temporary data view. If you'd like to modify your data, we can add the missing index patterns to the Security Data View. You can also manually select a data view here."
    );
  });
});
