/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';

import { SourcererScopeName } from '../store/model';
import { Sourcerer } from '.';
import { sourcererActions, sourcererModel } from '../store';
import { createMockStore, mockGlobalState, TestProviders } from '../../common/mock';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { fireEvent, waitFor, render } from '@testing-library/react';
import { useSourcererDataView } from '../containers';
import { useSignalHelpers } from '../containers/use_signal_helpers';
import { DEFAULT_INDEX_PATTERN } from '../../../common/constants';
import { sortWithExcludesAtEnd } from '../../../common/utils/sourcerer';

const mockDispatch = jest.fn();

jest.mock('../containers');
jest.mock('../containers/use_signal_helpers');
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

jest.mock('@kbn/react-kibana-mount', () => {
  const original = jest.requireActual('@kbn/react-kibana-mount');

  return {
    ...original,
    toMountPoint: jest.fn(),
  };
});

const mockUpdateUrlParam = jest.fn();
jest.mock('../../common/utils/global_query_string', () => {
  const original = jest.requireActual('../../common/utils/global_query_string');

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
const sourcererDataView = {
  indicesExist: true,
  loading: false,
};

describe('Sourcerer component', () => {
  const pollForSignalIndexMock = jest.fn();
  let wrapper: ReactWrapper;
  beforeEach(() => {
    jest.clearAllMocks();
    (useSourcererDataView as jest.Mock).mockReturnValue(sourcererDataView);
    (useSignalHelpers as jest.Mock).mockReturnValue({ signalIndexNeedsInit: false });
  });

  afterEach(() => {
    if (wrapper && wrapper.exists()) wrapper.unmount();
  });

  it('renders data view title', () => {
    wrapper = mount(
      <TestProviders>
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
    wrapper = mount(
      <TestProviders>
        <Sourcerer {...testProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="sourcerer-trigger"]`).first().simulate('click');
    expect(
      wrapper.find(`[data-test-subj="sourcerer-advanced-options-toggle"]`).first().text()
    ).toEqual('Advanced options');
  });

  it('renders tooltip', () => {
    wrapper = mount(
      <TestProviders>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="sourcerer-tooltip"]').prop('content')).toEqual(
      sortWithExcludesAtEnd(mockOptions.map((p) => p.label)).join(', ')
    );
  });

  it('renders popover button inside tooltip', () => {
    wrapper = mount(
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
    wrapper = mount(
      <TestProviders>
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
    const store = createMockStore({
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
    });
    wrapper = mount(
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
    const store = createMockStore({
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
    });
    wrapper = mount(
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

    const store = createMockStore(state2);
    wrapper = mount(
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
  it('Mounts with multiple options selected - timeline', async () => {
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

    const store = createMockStore(state2);
    const { getByTestId, queryByTitle, queryAllByTestId } = render(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );

    fireEvent.click(getByTestId('timeline-sourcerer-trigger'));
    await waitFor(() => {
      for (const pattern of patternList.slice(0, 2)) {
        expect(queryByTitle(pattern)).toBeInTheDocument();
      }
    });

    fireEvent.click(getByTestId('comboBoxInput'));
    await waitFor(() => {
      expect(queryAllByTestId('sourcerer-combo-option')).toHaveLength(title.split(',').length - 2);
    });
  });
  it('onSave dispatches setSelectedDataView', async () => {
    const store = createMockStore({
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
    });
    wrapper = mount(
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
    const store = createMockStore({
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
    });

    wrapper = mount(
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
    wrapper = mount(
      <TestProviders>
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
    const store = createMockStore({
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
    });
    wrapper = mount(
      <TestProviders store={store}>
        <Sourcerer {...defaultProps} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="sourcerer-trigger"]').first().simulate('click');
    wrapper.find('[data-test-subj="comboBoxClearButton"]').first().simulate('click');
    expect(wrapper.find('[data-test-subj="sourcerer-save"]').first().prop('disabled')).toBeTruthy();
  });
  it('Does display signals index on timeline sourcerer', async () => {
    /*
     * Since both enzyme and RTL share JSDOM when running these tests,
     * and enzyme does not clears jsdom after each test, because of this
     * `screen` of RTL does not work as expect, please avoid using screen
     * till all the tests have been converted to RTL
     *
     * */
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

    const store = createMockStore(state2);
    const el = render(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );

    fireEvent.click(el.getByTestId('timeline-sourcerer-trigger'));
    fireEvent.click(el.getByTestId('comboBoxToggleListButton'));

    await waitFor(() => {
      expect(el.queryAllByTestId('sourcerer-combo-option')[0].textContent).toBe(
        mockGlobalState.sourcerer.signalIndexName
      );
    });
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

    const store = createMockStore(state2);
    wrapper = mount(
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
      <TestProviders>
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
      <TestProviders>
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
      <TestProviders>
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
      <TestProviders>
        <Sourcerer scope={sourcererModel.SourcererScopeName.detections} />
      </TestProviders>
    );
    expect(pollForSignalIndexMock).toHaveBeenCalledTimes(1);
  });

  it('renders without a popover when analyzer is the scope', () => {
    mount(
      <TestProviders>
        <Sourcerer scope={sourcererModel.SourcererScopeName.analyzer} />
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="sourcerer-popover"]`).exists()).toBeFalsy();
  });
});
