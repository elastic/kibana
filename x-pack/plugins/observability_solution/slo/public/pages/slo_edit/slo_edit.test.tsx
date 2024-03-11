/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicense } from '@kbn/licensing-plugin/common/types';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import { cleanup, fireEvent, waitFor } from '@testing-library/react';
import { createBrowserHistory } from 'history';
import React from 'react';
import Router from 'react-router-dom';
import { BehaviorSubject } from 'rxjs';
import { paths } from '../../../common/locators/paths';
import { buildSlo } from '../../data/slo/slo';
import { useCapabilities } from '../../hooks/use_capabilities';
import { useCreateSlo } from '../../hooks/use_create_slo';
import { useFetchApmSuggestions } from '../../hooks/use_fetch_apm_suggestions';
import { useFetchSloDetails } from '../../hooks/use_fetch_slo_details';
import { useUpdateSlo } from '../../hooks/use_update_slo';
import { useCreateRule, useFetchDataViews } from '@kbn/observability-plugin/public';
import { useFetchIndices } from '../../hooks/use_fetch_indices';
import { useKibana } from '../../utils/kibana_react';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { render } from '../../utils/test_helper';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from './constants';
import { SloEditPage } from './slo_edit';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('@kbn/observability-shared-plugin/public');
jest.mock('../../hooks/use_fetch_indices');
jest.mock('../../hooks/use_fetch_slo_details');
jest.mock('../../hooks/use_create_slo');
jest.mock('../../hooks/use_update_slo');
jest.mock('@kbn/observability-plugin/public');
jest.mock('../../hooks/use_fetch_apm_suggestions');
jest.mock('../../hooks/use_capabilities');

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../utils/kibana_react', () => ({
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

const useKibanaMock = useKibana as jest.Mock;
const useFetchIndicesMock = useFetchIndices as jest.Mock;
const useFetchDataViewsMock = useFetchDataViews as jest.Mock;
const useFetchSloMock = useFetchSloDetails as jest.Mock;
const useCreateSloMock = useCreateSlo as jest.Mock;
const useUpdateSloMock = useUpdateSlo as jest.Mock;
const useCreateRuleMock = useCreateRule as jest.Mock;
const useFetchApmSuggestionsMock = useFetchApmSuggestions as jest.Mock;
const useCapabilitiesMock = useCapabilities as jest.Mock;

const HeaderMenuPortalMock = HeaderMenuPortal as jest.Mock;
HeaderMenuPortalMock.mockReturnValue(<div>Portal node</div>);

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const mockNavigate = jest.fn();
const mockBasePathPrepend = jest.fn();
const licenseMock = licensingMock.createLicenseMock();

const mockKibana = (license: ILicense | null = licenseMock) => {
  useKibanaMock.mockReturnValue({
    services: {
      theme: {},
      application: {
        navigateToUrl: mockNavigate,
      },
      charts: {
        theme: {
          useChartsBaseTheme: () => {},
        },
      },
      data: {
        dataViews: {
          find: jest.fn().mockReturnValue([]),
          get: jest.fn().mockReturnValue([]),
          getDefault: jest.fn(),
        },
      },
      dataViews: {
        create: jest.fn().mockResolvedValue({
          getIndexPattern: jest.fn().mockReturnValue('some-index'),
        }),
      },
      docLinks: {
        links: {
          query: {},
        },
      },
      http: {
        basePath: {
          prepend: mockBasePathPrepend,
        },
      },
      notifications: {
        toasts: {
          addError: mockAddError,
          addSuccess: mockAddSuccess,
        },
      },
      observabilityAIAssistant: observabilityAIAssistantPluginMock.createStartContract(),
      storage: {
        get: () => {},
      },
      triggersActionsUi: {
        getAddRuleFlyout: jest
          .fn()
          .mockReturnValue(<div data-test-subj="add-rule-flyout">Add Rule Flyout</div>),
      },
      uiSettings: {
        get: () => {},
      },
      unifiedSearch: {
        ui: {
          QueryStringInput: () => <div>Query String Input</div>,
          SearchBar: () => <div>Search Bar</div>,
        },
        autocomplete: {
          hasQuerySuggestions: () => {},
        },
      },
      licensing: {
        license$: new BehaviorSubject(license),
      },
    },
  });
};

describe('SLO Edit Page', () => {
  const mockCreate = jest.fn(() => Promise.resolve({ id: 'mock-slo-id' }));
  const mockUpdate = jest.fn();
  const mockCreateRule = jest.fn();

  const history = createBrowserHistory();

  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();

    // Silence all the ref errors in Eui components.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    history.replace('');
    jest.spyOn(Router, 'useHistory').mockReturnValue(history);

    useFetchDataViewsMock.mockReturnValue({
      isLoading: false,
      data: [{ getName: () => 'dataview', getIndexPattern: () => '.dataview-index' }],
    });
    useFetchIndicesMock.mockReturnValue({
      isLoading: false,
      data: ['some-index', 'index-2'],
    });

    useCreateSloMock.mockReturnValue({
      isLoading: false,
      isSuccess: false,
      isError: false,
      mutateAsync: mockCreate,
    });

    useCreateRuleMock.mockReturnValue({
      isLoading: false,
      isSuccess: false,
      isError: false,
      mutateAsync: mockCreateRule,
    });

    useUpdateSloMock.mockReturnValue({
      isLoading: false,
      isSuccess: false,
      isError: false,
      mutateAsync: mockUpdate,
    });
  });

  afterEach(cleanup);

  describe('when the incorrect license is found', () => {
    beforeEach(() => {
      useCapabilitiesMock.mockReturnValue({
        hasWriteCapabilities: true,
        hasReadCapabilities: true,
      });
      licenseMock.hasAtLeast.mockReturnValue(false);
    });

    it('navigates to the SLO List page', async () => {
      jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '1234' });
      jest
        .spyOn(Router, 'useLocation')
        .mockReturnValue({ pathname: '/slos/1234/edit', search: '', state: '', hash: '' });

      useFetchSloMock.mockReturnValue({ isLoading: false, data: undefined });

      render(<SloEditPage />);

      expect(mockNavigate).toBeCalledWith(mockBasePathPrepend(paths.slos));
    });
  });

  describe('when the license is null', () => {
    beforeEach(() => {
      useCapabilitiesMock.mockReturnValue({
        hasWriteCapabilities: true,
        hasReadCapabilities: true,
      });
      mockKibana(null);
    });

    it('does not navigate to the SLO List page', async () => {
      jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '1234' });
      jest
        .spyOn(Router, 'useLocation')
        .mockReturnValue({ pathname: '/slos/1234/edit', search: '', state: '', hash: '' });

      useFetchSloMock.mockReturnValue({ isLoading: false, data: undefined });

      render(<SloEditPage />);

      expect(mockNavigate).not.toBeCalledWith(mockBasePathPrepend(paths.slos));
    });
  });

  describe('when the correct license is found', () => {
    beforeEach(() => {
      useCapabilitiesMock.mockReturnValue({
        hasWriteCapabilities: true,
        hasReadCapabilities: true,
      });
      licenseMock.hasAtLeast.mockReturnValue(true);
    });

    describe('with no write permission', () => {
      beforeEach(() => {
        useCapabilitiesMock.mockReturnValue({
          hasWriteCapabilities: false,
          hasReadCapabilities: true,
        });
      });

      it('redirects to the slo list page', async () => {
        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '1234' });
        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: '/slos/1234/edit', search: '', state: '', hash: '' });

        useFetchSloMock.mockReturnValue({ isLoading: false, data: undefined });

        render(<SloEditPage />);

        expect(mockNavigate).toBeCalledWith(mockBasePathPrepend(paths.slos));
      });
    });

    describe('when no sloId route param is provided', () => {
      beforeEach(() => {
        useFetchSloMock.mockReturnValue({ isLoading: false, data: undefined });
      });

      it('renders the SLO Edit page in pristine state', async () => {
        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: undefined });
        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: '/slos/1234/edit', search: '', state: '', hash: '' });

        const { queryByTestId } = render(<SloEditPage />);

        expect(queryByTestId('slosEditPage')).toBeTruthy();
        expect(queryByTestId('sloForm')).toBeTruthy();

        expect(queryByTestId('sloEditFormIndicatorSection')).toBeTruthy();
        // Show default values from the kql indicator
        expect(queryByTestId('sloFormIndicatorTypeSelect')).toHaveValue('sli.kql.custom');
        expect(queryByTestId('indexSelectionSelectedValue')).toBeNull();

        // other sections are hidden
        expect(queryByTestId('sloEditFormObjectiveSection')).toBeNull();
        expect(queryByTestId('sloEditFormDescriptionSection')).toBeNull();
      });

      it('prefills the form with values from URL', () => {
        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: undefined });

        history.replace(
          '/slos/create?_a=(indicator:(params:(environment:prod,service:cartService),type:sli.apm.transactionDuration))'
        );
        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: '/slos/create', search: '', state: '', hash: '' });

        useFetchApmSuggestionsMock.mockReturnValue({
          suggestions: ['cartService'],
          isLoading: false,
        });

        const { queryByTestId } = render(<SloEditPage />);

        expect(queryByTestId('slosEditPage')).toBeTruthy();
        expect(queryByTestId('sloForm')).toBeTruthy();

        expect(queryByTestId('sloEditFormIndicatorSection')).toBeTruthy();
        expect(queryByTestId('sloFormIndicatorTypeSelect')).toHaveValue(
          'sli.apm.transactionDuration'
        );
        expect(queryByTestId('apmLatencyServiceSelector')).toHaveTextContent('cartService');
        expect(queryByTestId('apmLatencyEnvironmentSelector')).toHaveTextContent('prod');

        expect(queryByTestId('sloEditFormObjectiveSection')).toBeFalsy();
        expect(queryByTestId('sloEditFormDescriptionSection')).toBeFalsy();
      });
    });

    describe('when a sloId route param is provided', () => {
      it('prefills the form with the SLO values', async () => {
        const slo = buildSlo({ id: '123Foo' });
        useFetchSloMock.mockReturnValue({ isLoading: false, isInitialLoading: false, data: slo });
        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123Foo' });

        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: '/slos/123Foo/edit', search: '', state: '', hash: '' });

        const { queryByTestId } = render(<SloEditPage />);

        expect(queryByTestId('slosEditPage')).toBeTruthy();
        expect(queryByTestId('sloForm')).toBeTruthy();

        // all sections are visible
        expect(queryByTestId('sloEditFormIndicatorSection')).toBeTruthy();
        expect(queryByTestId('sloEditFormObjectiveSection')).toBeTruthy();
        expect(queryByTestId('sloEditFormDescriptionSection')).toBeTruthy();

        expect(queryByTestId('sloFormBudgetingMethodSelect')).toHaveValue(slo.budgetingMethod);
        expect(queryByTestId('sloFormTimeWindowDurationSelect')).toHaveValue(
          slo.timeWindow.duration
        );
        expect(queryByTestId('sloFormObjectiveTargetInput')).toHaveValue(
          slo.objective.target * 100
        );

        expect(queryByTestId('sloFormNameInput')).toHaveValue(slo.name);
        expect(queryByTestId('sloFormDescriptionTextArea')).toHaveValue(slo.description);
      });

      it('calls the updateSlo hook if all required values are filled in', async () => {
        const slo = buildSlo({ id: '123' });
        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });
        useFetchSloMock.mockReturnValue({ isLoading: false, data: slo });

        const { queryByTestId } = render(<SloEditPage />);

        expect(queryByTestId('sloFormSubmitButton')).toBeEnabled();
        fireEvent.click(queryByTestId('sloFormSubmitButton')!);

        expect(mockUpdate).toMatchInlineSnapshot(`[MockFunction]`);
      });

      it('prefills the form with the provided URL values and the default values', () => {
        const slo = buildSlo({ id: '123' });
        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });

        history.push(
          '/slos/123/edit?_a=(name:%27updated-name%27,indicator:(params:(environment:prod,service:cartService),type:sli.apm.transactionDuration),objective:(target:0.92))'
        );
        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: '/slos/123/edit', search: '', state: '', hash: '' });

        useFetchSloMock.mockReturnValue({ isLoading: false, data: slo });

        useFetchApmSuggestionsMock.mockReturnValue({
          suggestions: ['cartService'],
          isLoading: false,
        });

        const { queryByTestId } = render(<SloEditPage />);

        // all sections are visible
        expect(queryByTestId('sloEditFormIndicatorSection')).toBeTruthy();
        expect(queryByTestId('sloEditFormObjectiveSection')).toBeTruthy();
        expect(queryByTestId('sloEditFormDescriptionSection')).toBeTruthy();

        expect(queryByTestId('indexSelectionSelectedValue')).toBeNull();
        expect(queryByTestId('sloFormBudgetingMethodSelect')).toHaveValue(
          SLO_EDIT_FORM_DEFAULT_VALUES.budgetingMethod
        );
        expect(queryByTestId('sloFormTimeWindowDurationSelect')).toHaveValue(
          SLO_EDIT_FORM_DEFAULT_VALUES.timeWindow.duration
        );
        expect(queryByTestId('sloFormObjectiveTargetInput')).toHaveValue(92);

        expect(queryByTestId('sloFormNameInput')).toHaveValue('updated-name');
        expect(queryByTestId('sloFormDescriptionTextArea')).toHaveValue('');
      });
    });

    describe('when submitting has completed successfully', () => {
      it('navigates to the SLO List page', async () => {
        const slo = buildSlo();

        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });
        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: '/slos/123/edit', search: '', state: '', hash: '' });

        useFetchSloMock.mockReturnValue({ isLoading: false, data: slo });

        const { getByTestId } = render(<SloEditPage />);

        expect(getByTestId('sloFormSubmitButton')).toBeEnabled();

        await waitFor(() => {
          fireEvent.click(getByTestId('sloFormSubmitButton'));
        });
        await waitFor(() => {
          expect(mockNavigate).toBeCalledWith(mockBasePathPrepend(paths.slos));
        });
      });
    });
  });
});
