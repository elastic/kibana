/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { dnsTopDomainsLensAttributes } from './lens_attributes/network/dns_top_domains';
import { VisualizationActions } from '.';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../mock';
import { createStore, State } from '../../store';
import { UpdateQueryParams, upsertQuery } from '../../store/inputs/helpers';
import { cloneDeep } from 'lodash';
import { useKibana } from '../../lib/kibana/kibana_react';
import { CASES_FEATURE_ID } from '../../../../common/constants';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useLocation: jest.fn(() => {
      return { pathname: 'network' };
    }),
  };
});
jest.mock('../../lib/kibana/kibana_react');
jest.mock('../../utils/route/use_route_spy', () => {
  return {
    useRouteSpy: jest.fn(() => [{ pageName: 'network', detailName: '', tabName: 'dns' }]),
  };
});
describe('VisualizationActions', () => {
  const refetch = jest.fn();
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  const newQuery: UpdateQueryParams = {
    inputId: 'global',
    id: 'networkDnsHistogramQuery',
    inspect: {
      dsl: ['mockDsl'],
      response: ['mockResponse'],
    },
    loading: false,
    refetch,
    state: state.inputs,
  };

  let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const props = {
    lensAttributes: dnsTopDomainsLensAttributes,
    queryId: 'networkDnsHistogramQuery',
    timerange: {
      from: '2022-03-06T16:00:00.000Z',
      to: '2022-03-07T15:59:59.999Z',
    },
    title: 'mock networkDnsHistogram',
  };
  const mockNavigateToPrefilledEditor = jest.fn();
  const mockGetCreateCaseFlyoutOpen = jest.fn();
  const mockGetAllCasesSelectorModalOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        lens: {
          canUseEditor: jest.fn(() => true),
          navigateToPrefilledEditor: mockNavigateToPrefilledEditor,
        },
        cases: {
          ...mockCasesContract(),
          hooks: {
            getUseCasesAddToExistingCaseModal: jest
              .fn()
              .mockReturnValue({ open: mockGetAllCasesSelectorModalOpen }),
            getUseCasesAddToNewCaseFlyout: jest
              .fn()
              .mockReturnValue({ open: mockGetCreateCaseFlyoutOpen }),
          },
        },
        application: {
          capabilities: { [CASES_FEATURE_ID]: { crud_cases: true, read_cases: true } },
          getUrlForApp: jest.fn(),
          navigateToApp: jest.fn(),
        },
        notifications: {
          toasts: {
            addError: jest.fn(),
            addSuccess: jest.fn(),
            addWarning: jest.fn(),
            remove: jest.fn(),
          },
        },
        http: jest.fn(),
        data: {
          search: jest.fn(),
        },
        storage: {
          set: jest.fn(),
        },
        theme: {},
      },
    });
    const myState = cloneDeep(state);
    myState.inputs = upsertQuery(newQuery);
    store = createStore(myState, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  });

  test('Should render VisualizationActions button', () => {
    const { container } = render(
      <TestProviders store={store}>
        <VisualizationActions {...props} />
      </TestProviders>
    );
    expect(
      container.querySelector(`[data-test-subj="stat-networkDnsHistogramQuery"]`)
    ).toBeInTheDocument();
  });

  test('Should render Open in Lens button', () => {
    const { container } = render(
      <TestProviders store={store}>
        <VisualizationActions {...props} />
      </TestProviders>
    );
    fireEvent.click(container.querySelector(`[data-test-subj="stat-networkDnsHistogramQuery"]`)!);

    expect(screen.getByText('Open in Lens')).toBeInTheDocument();
    expect(screen.getByText('Open in Lens')).not.toBeDisabled();
  });

  test('Should call NavigateToPrefilledEditor when Open in Lens', () => {
    const { container } = render(
      <TestProviders store={store}>
        <VisualizationActions {...props} />
      </TestProviders>
    );
    fireEvent.click(container.querySelector(`[data-test-subj="stat-networkDnsHistogramQuery"]`)!);

    fireEvent.click(screen.getByText('Open in Lens'));
    expect(mockNavigateToPrefilledEditor.mock.calls[0][0].timeRange).toEqual(props.timerange);
    expect(mockNavigateToPrefilledEditor.mock.calls[0][0].attributes.title).toEqual(
      props.lensAttributes.title
    );
    expect(mockNavigateToPrefilledEditor.mock.calls[0][0].attributes.references).toEqual([
      {
        id: 'security-solution',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'security-solution',
        name: 'indexpattern-datasource-layer-b1c3efc6-c886-4fba-978f-3b6bb5e7948a',
        type: 'index-pattern',
      },
      { id: 'security-solution', name: 'filter-index-pattern-0', type: 'index-pattern' },
    ]);
    expect(mockNavigateToPrefilledEditor.mock.calls[0][1].openInNewTab).toEqual(true);
  });

  test('Should render Inspect button', () => {
    const { container } = render(
      <TestProviders store={store}>
        <VisualizationActions {...props} />
      </TestProviders>
    );
    fireEvent.click(container.querySelector(`[data-test-subj="stat-networkDnsHistogramQuery"]`)!);

    expect(screen.getByText('Inspect')).toBeInTheDocument();
    expect(screen.getByText('Inspect')).not.toBeDisabled();
  });

  test('Should render Inspect Modal after clicking the inspect button', () => {
    const { baseElement, container } = render(
      <TestProviders store={store}>
        <VisualizationActions {...props} />
      </TestProviders>
    );
    fireEvent.click(container.querySelector(`[data-test-subj="stat-networkDnsHistogramQuery"]`)!);

    expect(screen.getByText('Inspect')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Inspect'));
    expect(
      baseElement.querySelector('[data-test-subj="modal-inspect-euiModal"]')
    ).toBeInTheDocument();
  });

  test('Should render Add to new case button', () => {
    const { container } = render(
      <TestProviders store={store}>
        <VisualizationActions {...props} />
      </TestProviders>
    );
    fireEvent.click(container.querySelector(`[data-test-subj="stat-networkDnsHistogramQuery"]`)!);

    expect(screen.getByText('Add to new case')).toBeInTheDocument();
    expect(screen.getByText('Add to new case')).not.toBeDisabled();
  });

  test('Should render Add to new case modal after clicking on Add to new case button', () => {
    const { container } = render(
      <TestProviders store={store}>
        <VisualizationActions {...props} />
      </TestProviders>
    );
    fireEvent.click(container.querySelector(`[data-test-subj="stat-networkDnsHistogramQuery"]`)!);
    fireEvent.click(screen.getByText('Add to new case'));

    expect(mockGetCreateCaseFlyoutOpen).toBeCalled();
  });

  test('Should render Add to existing case button', () => {
    const { container } = render(
      <TestProviders store={store}>
        <VisualizationActions {...props} />
      </TestProviders>
    );
    fireEvent.click(container.querySelector(`[data-test-subj="stat-networkDnsHistogramQuery"]`)!);

    expect(screen.getByText('Add to existing case')).toBeInTheDocument();
    expect(screen.getByText('Add to existing case')).not.toBeDisabled();
  });

  test('Should render Add to existing case modal after clicking on Add to existing case button', () => {
    const { container } = render(
      <TestProviders store={store}>
        <VisualizationActions {...props} />
      </TestProviders>
    );
    fireEvent.click(container.querySelector(`[data-test-subj="stat-networkDnsHistogramQuery"]`)!);
    fireEvent.click(screen.getByText('Add to existing case'));

    expect(mockGetAllCasesSelectorModalOpen).toBeCalled();
  });
});
