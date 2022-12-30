/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { HomePage } from '.';
import type { SavedQuery } from '@kbn/data-plugin/public';
import { FilterManager } from '@kbn/data-plugin/public';

import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../common/mock';
import { inputsActions } from '../../common/store/inputs';
import {
  setSearchBarFilter,
  setAbsoluteRangeDatePicker,
  setRelativeRangeDatePicker,
} from '../../common/store/inputs/actions';
import { coreMock } from '@kbn/core/public/mocks';
import type { Filter } from '@kbn/es-query';
import { createStore } from '../../common/store';
import type { TimeRange, UrlInputsModel } from '../../common/store/inputs/model';
import { SecurityPageName } from '../types';
import type { TimelineUrl } from '../../timelines/store/timeline/model';
import { timelineDefaults } from '../../timelines/store/timeline/defaults';
import { URL_PARAM_KEY } from '../../common/hooks/use_url_state';
import { InputsModelId } from '../../common/store/inputs/constants';

jest.mock('../../common/store/inputs/actions');

const mockRouteSpy = jest.fn().mockReturnValue([{ pageName: 'hosts' }]);

jest.mock('../../common/utils/route/use_route_spy', () => ({
  useRouteSpy: () => mockRouteSpy(),
}));

const DummyComponent = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const mockedUseInitializeUrlParam = jest.fn();

const mockUseInitializeUrlParam = (urlParamKey: string, state: unknown) => {
  mockedUseInitializeUrlParam.mockImplementation((key, fn) => {
    if (urlParamKey === key) {
      fn(state);
    }
  });
};

const mockUpdateUrlParam = jest.fn();

jest.mock('../../common/utils/global_query_string', () => {
  const original = jest.requireActual('../../common/utils/global_query_string');
  return {
    ...original,
    useInitializeUrlParam: (...params: unknown[]) => mockedUseInitializeUrlParam(...params),
    useSyncGlobalQueryString: jest.fn(),
    useUpdateUrlParam: () => mockUpdateUrlParam,
  };
});

jest.mock('../../common/components/drag_and_drop/drag_drop_context_wrapper', () => ({
  DragDropContextWrapper: DummyComponent,
}));

jest.mock('./template_wrapper', () => ({
  SecuritySolutionTemplateWrapper: DummyComponent,
}));
const DATE_TIME_NOW = '2020-01-01T00:00:00.000Z';
jest.mock('../../common/components/super_date_picker', () => ({
  formatDate: (date: string) => DATE_TIME_NOW,
}));

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: jest.fn().mockReturnValue({ pathname: '/test', search: '?' }),
  };
});

const mockQueryTimelineById = jest.fn();
jest.mock('../../timelines/components/open_timeline/helpers', () => {
  const original = jest.requireActual('../../timelines/components/open_timeline/helpers');
  return {
    ...original,
    queryTimelineById: (params: unknown) => mockQueryTimelineById(params),
  };
});

const mockGetTimiline = jest.fn();

jest.mock('../../timelines/store/timeline', () => ({
  timelineSelectors: {
    getTimelineByIdSelector: () => mockGetTimiline,
  },
}));

const mockedFilterManager = new FilterManager(coreMock.createStart().uiSettings);
const mockGetSavedQuery = jest.fn();

const dummyFilter: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'dummy',
    params: {
      query: 'value',
    },
  },
  query: {
    term: {
      dummy: 'value',
    },
  },
};

jest.mock('../../common/lib/kibana', () => {
  const original = jest.requireActual('../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        data: {
          ...original.useKibana().services.data,
          query: {
            ...original.useKibana().services.data.query,
            filterManager: mockedFilterManager,
            savedQueries: { getSavedQuery: mockGetSavedQuery },
          },
        },
      },
    }),
    KibanaServices: {
      get: jest.fn(() => ({ uiSettings: { get: () => ({ from: 'now-24h', to: 'now' }) } })),
    },
  };
});

const mockDispatch = jest.fn();

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseInitializeUrlParam.mockImplementation(jest.fn());
    mockedFilterManager.setFilters([]);
  });

  it('calls useInitializeUrlParam for appQuery, filters and savedQuery', () => {
    render(
      <TestProviders>
        <HomePage setHeaderActionMenu={jest.fn()}>
          <span />
        </HomePage>
      </TestProviders>
    );

    expect(mockedUseInitializeUrlParam).toHaveBeenCalledWith(
      URL_PARAM_KEY.appQuery,
      expect.any(Function)
    );
    expect(mockedUseInitializeUrlParam).toHaveBeenCalledWith(
      URL_PARAM_KEY.filters,
      expect.any(Function)
    );
    expect(mockedUseInitializeUrlParam).toHaveBeenCalledWith(
      URL_PARAM_KEY.savedQuery,
      expect.any(Function)
    );
  });

  it('dispatches setFilterQuery when initializing appQuery', () => {
    const state = { query: 'testQuery', language: 'en' };
    mockUseInitializeUrlParam(URL_PARAM_KEY.appQuery, state);

    render(
      <TestProviders>
        <HomePage setHeaderActionMenu={jest.fn()}>
          <span />
        </HomePage>
      </TestProviders>
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      inputsActions.setFilterQuery({
        id: InputsModelId.global,
        query: state.query,
        language: state.language,
      })
    );
  });

  it('initializes saved query store', async () => {
    const state = 'test-query-id';
    const savedQueryData: SavedQuery = {
      id: 'testSavedquery',
      attributes: {
        title: 'testtitle',
        description: 'testDescription',
        query: { query: 'testQuery', language: 'testLanguage' },
        filters: [
          {
            meta: {
              alias: null,
              negate: false,
              disabled: false,
            },
            query: {},
          },
        ],
      },
    };

    mockGetSavedQuery.mockResolvedValue(savedQueryData);
    mockUseInitializeUrlParam(URL_PARAM_KEY.savedQuery, state);

    render(
      <TestProviders>
        <HomePage setHeaderActionMenu={jest.fn()}>
          <span />
        </HomePage>
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        inputsActions.setSavedQuery({ id: InputsModelId.global, savedQuery: savedQueryData })
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        inputsActions.setFilterQuery({
          id: InputsModelId.global,
          ...savedQueryData.attributes.query,
        })
      );
      expect(setSearchBarFilter).toHaveBeenCalledWith({
        id: InputsModelId.global,
        filters: savedQueryData.attributes.filters,
      });
    });
  });

  describe('Filters', () => {
    it('sets filter initial value in the store and filterManager', () => {
      const state = [{ testFilter: 'test' }];
      mockUseInitializeUrlParam(URL_PARAM_KEY.filters, state);
      const spySetFilters = jest.spyOn(mockedFilterManager, 'setFilters');

      render(
        <TestProviders>
          <HomePage setHeaderActionMenu={jest.fn()}>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(setSearchBarFilter).toHaveBeenCalledWith({
        id: InputsModelId.global,
        filters: state,
      });

      expect(spySetFilters).toHaveBeenCalledWith(state);
    });

    it('sets filter from store when URL param has no value', () => {
      const state = null;
      mockUseInitializeUrlParam(URL_PARAM_KEY.filters, state);
      const spySetAppFilters = jest.spyOn(mockedFilterManager, 'setAppFilters');
      const { storage } = createSecuritySolutionStorageMock();

      const mockstate = {
        ...mockGlobalState,
        inputs: {
          ...mockGlobalState.inputs,
          global: {
            ...mockGlobalState.inputs.global,
            filters: [dummyFilter],
          },
        },
      };

      const mockStore = createStore(mockstate, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

      render(
        <TestProviders store={mockStore}>
          <HomePage setHeaderActionMenu={jest.fn()}>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(spySetAppFilters).toHaveBeenCalledWith([dummyFilter]);
    });

    it('preserves pinned filters when URL param has no value', () => {
      const state = null;
      mockUseInitializeUrlParam(URL_PARAM_KEY.filters, state);
      // pin filter
      mockedFilterManager.setGlobalFilters([dummyFilter]);

      render(
        <TestProviders>
          <HomePage setHeaderActionMenu={jest.fn()}>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(mockedFilterManager.getFilters()).toEqual([
        {
          ...dummyFilter,
          $state: {
            store: 'globalState',
          },
        },
      ]);
    });
  });

  describe('Timerange', () => {
    it('sets global absolute timerange initial value in the store', () => {
      const timerange: TimeRange = {
        from: '2020-07-07T08:20:18.966Z',
        fromStr: undefined,
        kind: 'absolute',
        to: '2020-07-08T08:20:18.966Z',
        toStr: undefined,
      };

      const state: UrlInputsModel = {
        global: {
          [URL_PARAM_KEY.timerange]: timerange,
          linkTo: [InputsModelId.timeline],
        },
        timeline: {
          [URL_PARAM_KEY.timerange]: timerange,
          linkTo: [InputsModelId.global],
        },
      };

      mockUseInitializeUrlParam(URL_PARAM_KEY.timerange, state);

      render(
        <TestProviders>
          <HomePage setHeaderActionMenu={jest.fn()}>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(setAbsoluteRangeDatePicker).toHaveBeenCalledWith({
        from: timerange.from,
        to: timerange.to,
        kind: timerange.kind,
        id: InputsModelId.global,
      });

      expect(setAbsoluteRangeDatePicker).toHaveBeenCalledWith({
        from: timerange.from,
        to: timerange.to,
        kind: timerange.kind,
        id: InputsModelId.timeline,
      });
    });

    it('sets updated relative timerange initial value in the store', () => {
      const timerange: TimeRange = {
        from: '2019-01-01T00:00:00.000Z',
        fromStr: 'now-1d/d',
        kind: 'relative',
        to: '2019-01-01T00:00:00.000Z',
        toStr: 'now-1d/d',
      };

      const state: UrlInputsModel = {
        global: {
          [URL_PARAM_KEY.timerange]: timerange,
          linkTo: [InputsModelId.timeline],
        },
        timeline: {
          [URL_PARAM_KEY.timerange]: timerange,
          linkTo: [InputsModelId.global],
        },
      };

      mockUseInitializeUrlParam(URL_PARAM_KEY.timerange, state);

      render(
        <TestProviders>
          <HomePage setHeaderActionMenu={jest.fn()}>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(setRelativeRangeDatePicker).toHaveBeenCalledWith({
        ...timerange,
        to: DATE_TIME_NOW,
        from: DATE_TIME_NOW,
        id: InputsModelId.global,
      });

      expect(setRelativeRangeDatePicker).toHaveBeenCalledWith({
        ...timerange,
        to: DATE_TIME_NOW,
        from: DATE_TIME_NOW,
        id: InputsModelId.timeline,
      });
    });

    it('update timerange when navigating to alerts page', () => {
      const timerange: TimeRange = {
        from: '2019-01-01T00:00:00.000Z',
        fromStr: 'now-1d/d',
        kind: 'relative',
        to: '2019-01-01T00:00:00.000Z',
        toStr: 'now-1d/d',
      };

      const mockstate = {
        ...mockGlobalState,
        inputs: {
          ...mockGlobalState.inputs,
          global: {
            ...mockGlobalState.inputs.global,
            timerange,
          },
          timeline: {
            ...mockGlobalState.inputs.timeline,
            timerange,
          },
        },
      };

      const { storage } = createSecuritySolutionStorageMock();
      const mockStore = createStore(mockstate, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

      const TestComponent = () => (
        <TestProviders store={mockStore}>
          <HomePage setHeaderActionMenu={jest.fn()}>
            <span />
          </HomePage>
        </TestProviders>
      );

      const { rerender } = render(<TestComponent />);
      jest.clearAllMocks();

      // simulate page navigation
      mockRouteSpy.mockReturnValueOnce([{ pageName: SecurityPageName.alerts }]);
      rerender(<TestComponent />);

      expect(setRelativeRangeDatePicker).toHaveBeenCalledWith({
        ...timerange,
        to: DATE_TIME_NOW,
        from: DATE_TIME_NOW,
        id: InputsModelId.global,
      });

      expect(setRelativeRangeDatePicker).toHaveBeenCalledWith({
        ...timerange,
        to: DATE_TIME_NOW,
        from: DATE_TIME_NOW,
        id: InputsModelId.timeline,
      });
    });

    it('does not update timerange when navigating to hosts page', () => {
      const timerange: TimeRange = {
        from: '2019-01-01T00:00:00.000Z',
        fromStr: 'now-1d/d',
        kind: 'relative',
        to: '2019-01-01T00:00:00.000Z',
        toStr: 'now-1d/d',
      };

      const mockstate = {
        ...mockGlobalState,
        inputs: {
          ...mockGlobalState.inputs,
          global: {
            ...mockGlobalState.inputs.global,
            timerange,
          },
          timeline: {
            ...mockGlobalState.inputs.timeline,
            timerange,
          },
        },
      };

      const { storage } = createSecuritySolutionStorageMock();
      const mockStore = createStore(mockstate, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

      const TestComponent = () => (
        <TestProviders store={mockStore}>
          <HomePage setHeaderActionMenu={jest.fn()}>
            <span />
          </HomePage>
        </TestProviders>
      );

      const { rerender } = render(<TestComponent />);
      jest.clearAllMocks();

      // simulate page navigation
      mockRouteSpy.mockReturnValueOnce([{ pageName: SecurityPageName.hosts }]);
      rerender(<TestComponent />);

      expect(setRelativeRangeDatePicker).not.toHaveBeenCalledWith({
        ...timerange,
        to: DATE_TIME_NOW,
        from: DATE_TIME_NOW,
        id: InputsModelId.global,
      });

      expect(setRelativeRangeDatePicker).not.toHaveBeenCalledWith({
        ...timerange,
        to: DATE_TIME_NOW,
        from: DATE_TIME_NOW,
        id: InputsModelId.timeline,
      });
    });
  });

  describe('Timeline', () => {
    it('initializes Timeline store', () => {
      const timeline: TimelineUrl = {
        id: 'testSavedTimelineId',
        isOpen: false,
      };

      mockUseInitializeUrlParam(URL_PARAM_KEY.timeline, timeline);

      render(
        <TestProviders>
          <HomePage setHeaderActionMenu={jest.fn()}>
            <span />
          </HomePage>
        </TestProviders>
      );

      expect(mockQueryTimelineById).toHaveBeenCalledWith(
        expect.objectContaining({
          timelineId: timeline.id,
          openTimeline: timeline.isOpen,
        })
      );
    });

    it('it removes empty timeline state from URL', async () => {
      const { storage } = createSecuritySolutionStorageMock();
      const store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

      mockUseInitializeUrlParam(URL_PARAM_KEY.timeline, {
        id: 'testSavedTimelineId',
        isOpen: false,
      });

      const TestComponent = () => (
        <TestProviders store={store}>
          <HomePage setHeaderActionMenu={jest.fn()}>
            <span />
          </HomePage>
        </TestProviders>
      );

      const { rerender } = render(<TestComponent />);

      jest.clearAllMocks();
      mockGetTimiline.mockReturnValue({ ...timelineDefaults, savedObjectId: null });

      rerender(<TestComponent />);

      expect(mockUpdateUrlParam).toHaveBeenCalledWith(null);
    });

    it('it updates URL when timeline store changes', async () => {
      const { storage } = createSecuritySolutionStorageMock();
      const store = createStore(mockGlobalState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
      const savedObjectId = 'testTimelineId';

      mockUseInitializeUrlParam(URL_PARAM_KEY.timeline, {
        id: 'testSavedTimelineId',
        isOpen: false,
      });

      const TestComponent = () => (
        <TestProviders store={store}>
          <HomePage setHeaderActionMenu={jest.fn()}>
            <span />
          </HomePage>
        </TestProviders>
      );

      const { rerender } = render(<TestComponent />);

      jest.clearAllMocks();
      mockGetTimiline.mockReturnValue({ ...timelineDefaults, savedObjectId });

      rerender(<TestComponent />);

      expect(mockUpdateUrlParam).toHaveBeenCalledWith(
        expect.objectContaining({ id: savedObjectId })
      );
    });
  });
});
