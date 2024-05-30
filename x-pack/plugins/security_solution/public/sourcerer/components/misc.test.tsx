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

import { initialSourcererState, SourcererScopeName } from '../store/model';
import { Sourcerer } from '.';
import { sourcererActions, sourcererModel } from '../store';
import { createMockStore, mockGlobalState, TestProviders } from '../../common/mock';
import { useSourcererDataView } from '../containers';
import { useSignalHelpers } from '../containers/use_signal_helpers';
import { TimelineId } from '../../../common/types/timeline';
import { TimelineType } from '../../../common/api/timeline';
import { sortWithExcludesAtEnd } from '../../../common/utils/sourcerer';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';

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

const { id, patternList } = mockGlobalState.sourcerer.defaultDataView;

const patternListNoSignals = sortWithExcludesAtEnd(
  patternList.filter((p) => p !== mockGlobalState.sourcerer.signalIndexName)
);
const sourcererDataView = {
  indicesExist: true,
  loading: false,
};

describe('No data', () => {
  const mockNoIndicesState = {
    ...mockGlobalState,
    sourcerer: {
      ...initialSourcererState,
    },
  };
  let store = createMockStore(mockNoIndicesState);
  const pollForSignalIndexMock = jest.fn();

  beforeEach(() => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      indicesExist: false,
    });
    (useSignalHelpers as jest.Mock).mockReturnValue({
      pollForSignalIndex: pollForSignalIndexMock,
      signalIndexNeedsInit: false,
    });
    store = createMockStore(mockNoIndicesState);
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
  let store = createMockStore(state2);
  const pollForSignalIndexMock = jest.fn();
  beforeEach(() => {
    (useSignalHelpers as jest.Mock).mockReturnValue({
      pollForSignalIndex: pollForSignalIndexMock,
      signalIndexNeedsInit: false,
    });
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      activePatterns: ['myFakebeat-*'],
    });
    store = createMockStore(state2);

    render(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Show Update available label', () => {
    expect(screen.getByTestId('sourcerer-deprecated-badge')).toBeInTheDocument();
  });

  test('Show correct tooltip', async () => {
    fireEvent.mouseOver(screen.getByTestId('timeline-sourcerer-trigger'));
    await waitFor(() => {
      expect(screen.getByTestId('sourcerer-tooltip').textContent).toBe('myFakebeat-*');
    });
  });

  test('Show UpdateDefaultDataViewModal', () => {
    fireEvent.click(screen.queryAllByTestId('timeline-sourcerer-trigger')[0]);

    fireEvent.click(screen.queryAllByTestId('sourcerer-deprecated-update')[0]);

    expect(screen.getByTestId('sourcerer-update-data-view-modal')).toBeVisible();
  });

  test('Show UpdateDefaultDataViewModal Callout', () => {
    fireEvent.click(screen.queryAllByTestId('timeline-sourcerer-trigger')[0]);

    fireEvent.click(screen.queryAllByTestId('sourcerer-deprecated-update')[0]);

    expect(screen.queryAllByTestId('sourcerer-deprecated-callout')[0].textContent).toBe(
      'This timeline uses a legacy data view selector'
    );

    expect(screen.queryAllByTestId('sourcerer-current-patterns-message')[0].textContent).toBe(
      'The active index patterns in this timeline are: myFakebeat-*'
    );

    expect(screen.queryAllByTestId('sourcerer-deprecated-message')[0].textContent).toBe(
      "We have preserved your timeline by creating a temporary data view. If you'd like to modify your data, we can recreate your temporary data view with the new data view selector. You can also manually select a data view here."
    );
  });

  test('Show Add index pattern in UpdateDefaultDataViewModal', () => {
    fireEvent.click(screen.queryAllByTestId('timeline-sourcerer-trigger')[0]);

    fireEvent.click(screen.queryAllByTestId('sourcerer-deprecated-update')[0]);

    expect(screen.queryAllByTestId('sourcerer-update-data-view')[0].textContent).toBe(
      'Add index pattern'
    );
  });

  test('Set all the index patterns from legacy timeline to sourcerer, after clicking on "Add index pattern"', async () => {
    fireEvent.click(screen.queryAllByTestId('timeline-sourcerer-trigger')[0]);

    fireEvent.click(screen.queryAllByTestId('sourcerer-deprecated-update')[0]);

    fireEvent.click(screen.queryAllByTestId('sourcerer-update-data-view')[0]);

    await waitFor(() => {
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
});

describe('Update available for timeline template', () => {
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
  let store = createMockStore(state2);

  beforeEach(() => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      activePatterns: ['myFakebeat-*'],
    });
    store = createMockStore(state2);

    render(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Show UpdateDefaultDataViewModal CallOut', () => {
    fireEvent.click(screen.getByTestId('timeline-sourcerer-trigger'));
    fireEvent.click(screen.getByTestId('sourcerer-deprecated-update'));

    expect(screen.getByTestId('sourcerer-deprecated-callout')).toHaveTextContent(
      'This timeline template uses a legacy data view selector'
    );

    expect(screen.getByTestId('sourcerer-deprecated-message')).toHaveTextContent(
      "We have preserved your timeline template by creating a temporary data view. If you'd like to modify your data, we can recreate your temporary data view with the new data view selector. You can also manually select a data view here."
    );
  });
});

describe('Missing index patterns', () => {
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
  let store = createMockStore(state2);
  beforeEach(() => {
    const pollForSignalIndexMock = jest.fn();
    (useSignalHelpers as jest.Mock).mockReturnValue({
      pollForSignalIndex: pollForSignalIndexMock,
      signalIndexNeedsInit: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Show UpdateDefaultDataViewModal CallOut for timeline', async () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      activePatterns: ['myFakebeat-*'],
    });
    const state3 = cloneDeep(state2);
    state3.timeline.timelineById[TimelineId.active].timelineType = TimelineType.default;
    store = createMockStore(state3);

    render(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('timeline-sourcerer-trigger'));

    fireEvent.click(screen.getByTestId('sourcerer-deprecated-update'));

    expect(screen.getByTestId('sourcerer-deprecated-callout').textContent).toBe(
      'This timeline is out of date with the Security Data View'
    );
    expect(screen.getByTestId('sourcerer-current-patterns-message').textContent).toBe(
      'The active index patterns in this timeline are: myFakebeat-*'
    );
    expect(screen.queryAllByTestId('sourcerer-missing-patterns-callout')[0].textContent).toBe(
      'Security Data View is missing the following index patterns: myFakebeat-*'
    );
    expect(screen.queryAllByTestId('sourcerer-missing-patterns-message')[0].textContent).toBe(
      "We have preserved your timeline by creating a temporary data view. If you'd like to modify your data, we can add the missing index patterns to the Security Data View. You can also manually select a data view here."
    );
  });

  test('Show UpdateDefaultDataViewModal CallOut for timeline template', async () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      activePatterns: ['myFakebeat-*'],
    });
    store = createMockStore(state2);

    render(
      <TestProviders store={store}>
        <Sourcerer scope={sourcererModel.SourcererScopeName.timeline} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('timeline-sourcerer-trigger'));

    fireEvent.click(screen.getByTestId('sourcerer-deprecated-update'));

    await waitFor(() => {
      expect(screen.queryAllByTestId('sourcerer-deprecated-callout')[0].textContent).toBe(
        'This timeline template is out of date with the Security Data View'
      );

      expect(screen.queryAllByTestId('sourcerer-current-patterns-message')[0].textContent).toBe(
        'The active index patterns in this timeline template are: myFakebeat-*'
      );

      expect(screen.queryAllByTestId('sourcerer-missing-patterns-callout')[0].textContent).toBe(
        'Security Data View is missing the following index patterns: myFakebeat-*'
      );

      expect(screen.queryAllByTestId('sourcerer-missing-patterns-message')[0].textContent).toBe(
        "We have preserved your timeline template by creating a temporary data view. If you'd like to modify your data, we can add the missing index patterns to the Security Data View. You can also manually select a data view here."
      );
    });
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

  let store = createMockStore(state);
  beforeEach(() => {
    const pollForSignalIndexMock = jest.fn();
    (useSignalHelpers as jest.Mock).mockReturnValue({
      pollForSignalIndex: pollForSignalIndexMock,
      signalIndexNeedsInit: false,
    });

    (useSourcererDataView as jest.Mock).mockReturnValue({
      ...sourcererDataView,
      activePatterns: ['myFakebeat-*'],
    });
    store = createMockStore(state);
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
