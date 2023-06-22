/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import Router from 'react-router-dom';
import { createBrowserHistory } from 'history';
import { waitFor, fireEvent, screen } from '@testing-library/dom';
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { render } from '../../utils/test_helper';
import { useKibana } from '../../utils/kibana_react';
import { useLicense } from '../../hooks/use_license';
import { useFetchIndices } from '../../hooks/use_fetch_indices';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { useCreateSlo } from '../../hooks/slo/use_create_slo';
import { useUpdateSlo } from '../../hooks/slo/use_update_slo';
import { useFetchApmSuggestions } from '../../hooks/slo/use_fetch_apm_suggestions';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { buildSlo } from '../../data/slo/slo';
import { paths } from '../../config/paths';
import { SloEditPage } from './slo_edit';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../hooks/use_breadcrumbs');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/use_fetch_indices');
jest.mock('../../hooks/slo/use_fetch_slo_details');
jest.mock('../../hooks/slo/use_create_slo');
jest.mock('../../hooks/slo/use_update_slo');
jest.mock('../../hooks/slo/use_fetch_apm_suggestions');

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../utils/kibana_react', () => ({
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

const useKibanaMock = useKibana as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;
const useFetchIndicesMock = useFetchIndices as jest.Mock;
const useFetchSloMock = useFetchSloDetails as jest.Mock;
const useCreateSloMock = useCreateSlo as jest.Mock;
const useUpdateSloMock = useUpdateSlo as jest.Mock;
const useFetchApmSuggestionsMock = useFetchApmSuggestions as jest.Mock;

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const mockNavigate = jest.fn();
const mockBasePathPrepend = jest.fn();

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      application: {
        navigateToUrl: mockNavigate,
      },
      data: {
        dataViews: {
          find: jest.fn().mockReturnValue([]),
          get: jest.fn().mockReturnValue([]),
        },
      },
      dataViews: {
        create: jest.fn().mockResolvedValue(42),
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
        autocomplete: {
          hasQuerySuggestions: () => {},
        },
      },
    },
  });
};

describe('SLO Edit Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();

    // Silence all the ref errors in Eui components.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(cleanup);

  describe('when the incorrect license is found', () => {
    beforeEach(() => {
      useLicenseMock.mockReturnValue({ hasAtLeast: () => false });
    });

    it('navigates to the SLO List page', async () => {
      jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '1234' });
      jest
        .spyOn(Router, 'useLocation')
        .mockReturnValue({ pathname: 'foo', search: '', state: '', hash: '' });

      useFetchSloMock.mockReturnValue({ isLoading: false, slo: undefined });

      useFetchIndicesMock.mockReturnValue({
        isLoading: false,
        indices: [{ name: 'some-index' }],
      });

      useCreateSloMock.mockReturnValue({
        isLoading: false,
        isSuccess: false,
        isError: false,
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
      });

      useUpdateSloMock.mockReturnValue({
        isLoading: false,
        isSuccess: false,
        isError: false,
        mutate: jest.fn(),
        mutateAsync: jest.fn(),
      });

      render(<SloEditPage />);

      expect(mockNavigate).toBeCalledWith(mockBasePathPrepend(paths.observability.slos));
    });
  });

  describe('when the correct license is found', () => {
    beforeEach(() => {
      useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
    });

    describe('when no sloId route param is provided', () => {
      it('renders the SLO Edit page in pristine state', async () => {
        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: undefined });
        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: 'foo', search: '', state: '', hash: '' });

        useFetchSloMock.mockReturnValue({ isLoading: false, slo: undefined });

        useFetchIndicesMock.mockReturnValue({
          isLoading: false,
          indices: [{ name: 'some-index' }],
        });

        useCreateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        useUpdateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        render(<SloEditPage />);

        expect(screen.queryByTestId('slosEditPage')).toBeTruthy();
        expect(screen.queryByTestId('sloForm')).toBeTruthy();

        expect(screen.queryByTestId('sloEditFormIndicatorSection')).toBeTruthy();
        // Show default values from the kql indicator
        expect(screen.queryByTestId('sloFormIndicatorTypeSelect')).toHaveValue('sli.kql.custom');
        expect(screen.queryByTestId('indexSelectionSelectedValue')).toBeNull();
        expect(screen.queryByTestId('customKqlIndicatorFormQueryFilterInput')).toHaveValue('');
        expect(screen.queryByTestId('customKqlIndicatorFormGoodQueryInput')).toHaveValue('');
        expect(screen.queryByTestId('customKqlIndicatorFormTotalQueryInput')).toHaveValue('');

        // other sections are hidden
        expect(screen.queryByTestId('sloEditFormObjectiveSection')).toBeNull();
        expect(screen.queryByTestId('sloEditFormDescriptionSection')).toBeNull();
      });

      it.skip('calls the createSlo hook if all required values are filled in', async () => {
        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: undefined });
        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: 'foo', search: '', state: '', hash: '' });

        useFetchIndicesMock.mockReturnValue({
          isLoading: false,
          indices: [{ name: 'some-index' }],
        });

        useFetchSloMock.mockReturnValue({ isLoading: false, slo: undefined });

        const mockCreate = jest.fn();
        const mockUpdate = jest.fn();

        useCreateSloMock.mockReturnValue({
          mutateAsync: mockCreate,
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        useUpdateSloMock.mockReturnValue({
          mutateAsync: mockUpdate,
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        render(<SloEditPage />);

        userEvent.type(screen.getByTestId('indexSelection'), 'some-index');
        userEvent.type(screen.getByTestId('customKqlIndicatorFormQueryFilterInput'), 'irrelevant');
        userEvent.type(screen.getByTestId('customKqlIndicatorFormGoodQueryInput'), 'irrelevant');
        userEvent.type(screen.getByTestId('customKqlIndicatorFormTotalQueryInput'), 'irrelevant');
        userEvent.selectOptions(screen.getByTestId('sloFormBudgetingMethodSelect'), 'occurrences');
        userEvent.selectOptions(screen.getByTestId('sloFormTimeWindowDurationSelect'), '7d');
        userEvent.clear(screen.getByTestId('sloFormObjectiveTargetInput'));
        userEvent.type(screen.getByTestId('sloFormObjectiveTargetInput'), '98.5');
        userEvent.type(screen.getByTestId('sloFormNameInput'), 'irrelevant');
        userEvent.type(screen.getByTestId('sloFormDescriptionTextArea'), 'irrelevant');

        // all sections are visible
        expect(screen.queryByTestId('sloEditFormIndicatorSection')).toBeTruthy();
        expect(screen.queryByTestId('sloEditFormObjectiveSection')).toBeTruthy();
        expect(screen.queryByTestId('sloEditFormDescriptionSection')).toBeTruthy();

        expect(screen.getByTestId('sloFormSubmitButton')).toBeEnabled();

        fireEvent.click(screen.getByTestId('sloFormSubmitButton')!);

        expect(mockCreate).toMatchInlineSnapshot(`
          [MockFunction] {
            "calls": Array [
              Array [
                Object {
                  "budgetingMethod": "occurrences",
                  "description": "irrelevant",
                  "indicator": Object {
                    "params": Object {
                      "filter": "irrelevant",
                      "good": "irrelevant",
                      "index": "some-index",
                      "total": "irrelevant",
                    },
                    "type": "sli.kql.custom",
                  },
                  "name": "irrelevant",
                  "objective": Object {
                    "target": 0.985,
                  },
                  "timeWindow": Object {
                    "duration": "7d",
                    "isRolling": true,
                  },
                },
              ],
            ],
            "results": Array [
              Object {
                "type": "return",
                "value": undefined,
              },
            ],
          }
        `);
      });

      it('prefills the form with values when URL Search parameters are passed', () => {
        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: undefined });

        const history = createBrowserHistory();
        history.push(
          '/slos/create?_a=(name:%27prefilledSloName%27,indicator:(params:(environment:prod,service:cartService),type:sli.apm.transactionDuration))'
        );
        jest.spyOn(Router, 'useHistory').mockReturnValue(history);
        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: 'foo', search: '', state: '', hash: '' });

        useFetchSloMock.mockReturnValue({ isLoading: false, slo: undefined });

        useFetchApmSuggestionsMock.mockReturnValue({
          suggestions: ['cartService'],
          isLoading: false,
        });

        useFetchIndicesMock.mockReturnValue({
          isLoading: false,
          indices: [{ name: 'some-index' }],
        });

        useCreateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        useUpdateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        render(<SloEditPage />);

        expect(screen.queryByTestId('slosEditPage')).toBeTruthy();
        expect(screen.queryByTestId('sloForm')).toBeTruthy();

        expect(screen.queryByTestId('sloEditFormIndicatorSection')).toBeTruthy();
        // Show default values from the kql indicator
        expect(screen.queryByTestId('sloFormIndicatorTypeSelect')).toHaveValue(
          'sli.apm.transactionDuration'
        );

        expect(screen.queryByTestId('sloEditFormObjectiveSection')).toBeTruthy();
        expect(screen.queryByTestId('sloEditFormDescriptionSection')).toBeTruthy();

        expect(screen.queryByTestId('apmLatencyServiceSelector')).toHaveTextContent('cartService');
        expect(screen.queryByTestId('apmLatencyEnvironmentSelector')).toHaveTextContent('prod');

        expect(screen.queryByTestId('sloFormNameInput')).toHaveValue('prefilledSloName');
      });
    });

    describe('when a sloId route param is provided', () => {
      it('renders the SLO Edit page with prefilled form values', async () => {
        const slo = buildSlo({ id: '123' });
        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });
        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: 'foo', search: '', state: '', hash: '' });

        useFetchSloMock.mockReturnValue({ isLoading: false, slo });

        useFetchIndicesMock.mockReturnValue({
          isLoading: false,
          indices: [{ name: 'some-index' }],
        });

        useCreateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        useUpdateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        render(<SloEditPage />);

        expect(screen.queryByTestId('slosEditPage')).toBeTruthy();
        expect(screen.queryByTestId('sloForm')).toBeTruthy();

        // all sections are visible
        expect(screen.queryByTestId('sloEditFormIndicatorSection')).toBeTruthy();
        expect(screen.queryByTestId('sloEditFormObjectiveSection')).toBeTruthy();
        expect(screen.queryByTestId('sloEditFormDescriptionSection')).toBeTruthy();

        expect(screen.queryByTestId('sloFormIndicatorTypeSelect')).toHaveValue(slo.indicator.type);
        expect(screen.queryByTestId('indexSelectionSelectedValue')).toHaveTextContent(
          slo.indicator.params.index!
        );
        expect(screen.queryByTestId('customKqlIndicatorFormQueryFilterInput')).toHaveValue(
          slo.indicator.type === 'sli.kql.custom' ? slo.indicator.params.filter : ''
        );
        expect(screen.queryByTestId('customKqlIndicatorFormGoodQueryInput')).toHaveValue(
          slo.indicator.type === 'sli.kql.custom' ? slo.indicator.params.good : ''
        );
        expect(screen.queryByTestId('customKqlIndicatorFormTotalQueryInput')).toHaveValue(
          slo.indicator.type === 'sli.kql.custom' ? slo.indicator.params.total : ''
        );

        expect(screen.queryByTestId('sloFormBudgetingMethodSelect')).toHaveValue(
          slo.budgetingMethod
        );
        expect(screen.queryByTestId('sloFormTimeWindowDurationSelect')).toHaveValue(
          slo.timeWindow.duration
        );
        expect(screen.queryByTestId('sloFormObjectiveTargetInput')).toHaveValue(
          slo.objective.target * 100
        );

        expect(screen.queryByTestId('sloFormNameInput')).toHaveValue(slo.name);
        expect(screen.queryByTestId('sloFormDescriptionTextArea')).toHaveValue(slo.description);
      });

      it('calls the updateSlo hook if all required values are filled in', async () => {
        const slo = buildSlo({ id: '123' });

        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });

        useFetchIndicesMock.mockReturnValue({
          isLoading: false,
          indices: [{ name: 'some-index' }],
        });

        useFetchSloMock.mockReturnValue({ isLoading: false, slo });

        const mockCreate = jest.fn();
        const mockUpdate = jest.fn();

        useCreateSloMock.mockReturnValue({
          mutateAsync: mockCreate,
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        useUpdateSloMock.mockReturnValue({
          mutateAsync: mockUpdate,
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        render(<SloEditPage />);

        expect(screen.queryByTestId('sloFormSubmitButton')).toBeEnabled();
        fireEvent.click(screen.queryByTestId('sloFormSubmitButton')!);

        expect(mockUpdate).toMatchInlineSnapshot(`[MockFunction]`);
      });

      it('does not prefill the form with URL Search parameters when they are passed', () => {
        const slo = buildSlo({ id: '123' });

        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });

        const history = createBrowserHistory();
        history.push(
          '/slos/create?_a=(name:%27prefilledSloName%27,indicator:(params:(environment:prod,service:cartService),type:sli.apm.transactionDuration))'
        );
        jest.spyOn(Router, 'useHistory').mockReturnValue(history);
        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: 'foo', search: '', state: '', hash: '' });

        useFetchSloMock.mockReturnValue({ isLoading: false, slo });

        useFetchApmSuggestionsMock.mockReturnValue({
          suggestions: ['cartService'],
          isLoading: false,
        });

        useFetchIndicesMock.mockReturnValue({
          isLoading: false,
          indices: [{ name: 'some-index' }],
        });

        useCreateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        useUpdateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        render(<SloEditPage />);

        // all sections are visible
        expect(screen.queryByTestId('sloEditFormIndicatorSection')).toBeTruthy();
        expect(screen.queryByTestId('sloEditFormObjectiveSection')).toBeTruthy();
        expect(screen.queryByTestId('sloEditFormDescriptionSection')).toBeTruthy();

        expect(screen.queryByTestId('sloFormIndicatorTypeSelect')).toHaveValue(slo.indicator.type);
        expect(screen.queryByTestId('indexSelectionSelectedValue')).toHaveTextContent(
          slo.indicator.params.index!
        );
        expect(screen.queryByTestId('customKqlIndicatorFormQueryFilterInput')).toHaveValue(
          slo.indicator.type === 'sli.kql.custom' ? slo.indicator.params.filter : ''
        );
        expect(screen.queryByTestId('customKqlIndicatorFormGoodQueryInput')).toHaveValue(
          slo.indicator.type === 'sli.kql.custom' ? slo.indicator.params.good : ''
        );
        expect(screen.queryByTestId('customKqlIndicatorFormTotalQueryInput')).toHaveValue(
          slo.indicator.type === 'sli.kql.custom' ? slo.indicator.params.total : ''
        );

        expect(screen.queryByTestId('sloFormBudgetingMethodSelect')).toHaveValue(
          slo.budgetingMethod
        );
        expect(screen.queryByTestId('sloFormTimeWindowDurationSelect')).toHaveValue(
          slo.timeWindow.duration
        );
        expect(screen.queryByTestId('sloFormObjectiveTargetInput')).toHaveValue(
          slo.objective.target * 100
        );

        expect(screen.queryByTestId('sloFormNameInput')).toHaveValue(slo.name);
        expect(screen.queryByTestId('sloFormDescriptionTextArea')).toHaveValue(slo.description);
      });
    });

    describe('when submitting has completed successfully', () => {
      it('navigates to the SLO List page when checkbox to create new rule is not checked', async () => {
        const slo = buildSlo();

        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });
        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: 'foo', search: '', state: '', hash: '' });

        useFetchSloMock.mockReturnValue({ isLoading: false, slo });

        useFetchIndicesMock.mockReturnValue({
          isLoading: false,
          indices: [{ name: 'some-index' }],
        });

        useCreateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        useUpdateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        render(<SloEditPage />);

        expect(screen.queryByTestId('sloFormSubmitButton')).toBeEnabled();

        await waitFor(() => {
          fireEvent.click(screen.getByTestId('sloFormSubmitButton'));
        });
        await waitFor(() => {
          expect(mockNavigate).toBeCalledWith(mockBasePathPrepend(paths.observability.slos));
        });
      });

      it('navigates to the SLO Edit page when checkbox to create new rule is checked', async () => {
        const slo = buildSlo();

        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });
        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: 'foo', search: '', state: '', hash: '' });

        useFetchSloMock.mockReturnValue({ isLoading: false, slo });

        useFetchIndicesMock.mockReturnValue({
          isLoading: false,
          indices: [{ name: 'some-index' }],
        });

        useCreateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        useUpdateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        render(<SloEditPage />);

        expect(screen.queryByTestId('sloFormSubmitButton')).toBeEnabled();

        await waitFor(() => {
          fireEvent.click(screen.getByTestId('createNewRuleCheckbox'));
          fireEvent.click(screen.getByTestId('sloFormSubmitButton'));
        });

        await waitFor(() => {
          expect(mockNavigate).toBeCalledWith(
            mockBasePathPrepend(`${paths.observability.sloEdit(slo.id)}?create-rule=true`)
          );
        });
      });

      it('opens the Add Rule Flyout when visiting an existing SLO with search params set', async () => {
        const slo = buildSlo();

        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });
        jest
          .spyOn(Router, 'useLocation')
          .mockReturnValue({ pathname: 'foo', search: 'create-rule=true', state: '', hash: '' });

        useFetchSloMock.mockReturnValue({ isLoading: false, slo });

        useFetchIndicesMock.mockReturnValue({
          isLoading: false,
          indices: [{ name: 'some-index' }],
        });

        useCreateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        useUpdateSloMock.mockReturnValue({
          mutateAsync: jest.fn(),
          isLoading: false,
          isSuccess: false,
          isError: false,
        });

        render(<SloEditPage />);

        await waitFor(() => {
          expect(screen.getByTestId('add-rule-flyout')).toBeTruthy();
        });
      });
    });
  });
});
