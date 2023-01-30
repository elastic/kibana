/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import Router from 'react-router-dom';
import { waitFor, fireEvent, screen } from '@testing-library/dom';
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { render } from '../../utils/test_helper';
import { useKibana } from '../../utils/kibana_react';
import { useLicense } from '../../hooks/use_license';
import { useFetchIndices } from '../../hooks/use_fetch_indices';
import { useFetchSloDetails } from '../../hooks/slo/use_fetch_slo_details';
import { useCreateOrUpdateSlo } from '../../hooks/slo/use_create_slo';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { ConfigSchema } from '../../plugin';
import { Subset } from '../../typings';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from './constants';
import { anSLO } from '../../data/slo/slo';
import { paths } from '../../config';
import { SloEditPage } from '.';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../hooks/use_breadcrumbs');
jest.mock('../../hooks/use_license');
jest.mock('../../hooks/use_fetch_indices');
jest.mock('../../hooks/slo/use_fetch_slo_details');
jest.mock('../../hooks/slo/use_create_slo');

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../utils/kibana_react', () => ({
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

const useKibanaMock = useKibana as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;
const useFetchIndicesMock = useFetchIndices as jest.Mock;
const useFetchSloMock = useFetchSloDetails as jest.Mock;
const useCreateOrUpdateSloMock = useCreateOrUpdateSlo as jest.Mock;

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const mockNavigate = jest.fn();
const mockBasePathPrepend = jest.fn();

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      application: { navigateToUrl: mockNavigate },
      http: {
        basePath: {
          prepend: mockBasePathPrepend,
        },
      },
      notifications: {
        toasts: {
          addSuccess: mockAddSuccess,
          addError: mockAddError,
        },
      },
    },
  });
};

const config: Subset<ConfigSchema> = {
  unsafe: {
    slo: { enabled: true },
  },
};

describe('SLO Edit Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();

    // Silence all the ref errors in Eui components.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(cleanup);

  describe('when the feature flag is disabled', () => {
    it('renders the not found page when no sloId param is passed', async () => {
      jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: undefined });

      useLicenseMock.mockReturnValue({ hasAtLeast: () => false });
      useFetchSloMock.mockReturnValue({ loading: false, slo: undefined });

      render(<SloEditPage />, { unsafe: { slo: { enabled: false } } });

      expect(screen.queryByTestId('pageNotFound')).toBeTruthy();
    });

    it('renders the not found page when sloId param is passed', async () => {
      jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '1234' });

      useLicenseMock.mockReturnValue({ hasAtLeast: () => false });
      useFetchSloMock.mockReturnValue({ loading: false, slo: undefined });

      render(<SloEditPage />, { unsafe: { slo: { enabled: false } } });

      expect(screen.queryByTestId('pageNotFound')).toBeTruthy();
    });
  });

  describe('when the feature flag is enabled', () => {
    describe('when the incorrect license is found', () => {
      it('navigates to the SLO List page', async () => {
        jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '1234' });

        useLicenseMock.mockReturnValue({ hasAtLeast: () => false });
        useFetchSloMock.mockReturnValue({ loading: false, slo: undefined });
        useFetchIndicesMock.mockReturnValue({
          loading: false,
          indices: [{ name: 'some-index' }],
        });
        useCreateOrUpdateSloMock.mockReturnValue({
          loading: false,
          success: false,
          error: '',
          createSlo: jest.fn(),
          updateSlo: jest.fn(),
        });

        render(<SloEditPage />, config);

        expect(mockNavigate).toBeCalledWith(mockBasePathPrepend(paths.observability.slos));
      });
    });

    describe('when the correct license is found', () => {
      describe('when no sloId route param is provided', () => {
        it('renders the SLO Edit page in pristine state', async () => {
          jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: undefined });

          useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
          useFetchSloMock.mockReturnValue({ loading: false, slo: undefined });
          useFetchIndicesMock.mockReturnValue({
            loading: false,
            indices: [{ name: 'some-index' }],
          });
          useCreateOrUpdateSloMock.mockReturnValue({
            loading: false,
            success: false,
            error: '',
            createSlo: jest.fn(),
            updateSlo: jest.fn(),
          });

          render(<SloEditPage />, config);

          expect(screen.queryByTestId('slosEditPage')).toBeTruthy();
          expect(screen.queryByTestId('sloForm')).toBeTruthy();

          expect(screen.queryByTestId('sloFormIndicatorTypeSelect')).toHaveValue(
            SLO_EDIT_FORM_DEFAULT_VALUES.indicator.type
          );

          expect(screen.queryByTestId('sloFormCustomKqlIndexInput')).toHaveValue(
            SLO_EDIT_FORM_DEFAULT_VALUES.indicator.params.index
          );
          expect(screen.queryByTestId('sloFormCustomKqlFilterQueryInput')).toHaveValue(
            SLO_EDIT_FORM_DEFAULT_VALUES.indicator.type === 'sli.kql.custom'
              ? SLO_EDIT_FORM_DEFAULT_VALUES.indicator.params.filter
              : ''
          );
          expect(screen.queryByTestId('sloFormCustomKqlGoodQueryInput')).toHaveValue(
            SLO_EDIT_FORM_DEFAULT_VALUES.indicator.type === 'sli.kql.custom'
              ? SLO_EDIT_FORM_DEFAULT_VALUES.indicator.params.good
              : ''
          );
          expect(screen.queryByTestId('sloFormCustomKqlTotalQueryInput')).toHaveValue(
            SLO_EDIT_FORM_DEFAULT_VALUES.indicator.type === 'sli.kql.custom'
              ? SLO_EDIT_FORM_DEFAULT_VALUES.indicator.params.total
              : ''
          );

          expect(screen.queryByTestId('sloFormBudgetingMethodSelect')).toHaveValue(
            SLO_EDIT_FORM_DEFAULT_VALUES.budgetingMethod
          );
          expect(screen.queryByTestId('sloFormTimeWindowDurationSelect')).toHaveValue(
            SLO_EDIT_FORM_DEFAULT_VALUES.timeWindow.duration as any
          );
          expect(screen.queryByTestId('sloFormObjectiveTargetInput')).toHaveValue(
            SLO_EDIT_FORM_DEFAULT_VALUES.objective.target
          );

          expect(screen.queryByTestId('sloFormNameInput')).toHaveValue(
            SLO_EDIT_FORM_DEFAULT_VALUES.name
          );
          expect(screen.queryByTestId('sloFormDescriptionTextArea')).toHaveValue(
            SLO_EDIT_FORM_DEFAULT_VALUES.description
          );
        });

        it.skip('calls the createSlo hook if all required values are filled in', async () => {
          jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: undefined });
          useFetchIndicesMock.mockReturnValue({
            loading: false,
            indices: [{ name: 'some-index' }],
          });
          useFetchSloMock.mockReturnValue({ loading: false, slo: undefined });
          const mockCreate = jest.fn();
          const mockUpdate = jest.fn();
          useCreateOrUpdateSloMock.mockReturnValue({
            loading: false,
            success: false,
            error: '',
            createSlo: mockCreate,
            updateSlo: mockUpdate,
          });

          render(<SloEditPage />, config);

          userEvent.type(screen.getByTestId('sloFormCustomKqlIndexInput'), 'some-index');
          userEvent.type(screen.getByTestId('sloFormCustomKqlFilterQueryInput'), 'irrelevant');
          userEvent.type(screen.getByTestId('sloFormCustomKqlGoodQueryInput'), 'irrelevant');
          userEvent.type(screen.getByTestId('sloFormCustomKqlTotalQueryInput'), 'irrelevant');
          userEvent.selectOptions(
            screen.getByTestId('sloFormBudgetingMethodSelect'),
            'occurrences'
          );
          userEvent.selectOptions(screen.getByTestId('sloFormTimeWindowDurationSelect'), '7d');
          userEvent.clear(screen.getByTestId('sloFormObjectiveTargetInput'));
          userEvent.type(screen.getByTestId('sloFormObjectiveTargetInput'), '98.5');
          userEvent.type(screen.getByTestId('sloFormNameInput'), 'irrelevant');
          userEvent.type(screen.getByTestId('sloFormDescriptionTextArea'), 'irrelevant');

          const t = Date.now();
          await waitFor(() => expect(screen.getByTestId('sloFormSubmitButton')).toBeEnabled());
          console.log('end waiting for submit button: ', Math.ceil(Date.now() - t));

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
      });

      describe('when a sloId route param is provided', () => {
        it('renders the SLO Edit page with prefilled form values', async () => {
          jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });

          useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
          useFetchSloMock.mockReturnValue({ loading: false, slo: anSLO });
          useFetchIndicesMock.mockReturnValue({
            loading: false,
            indices: [{ name: 'some-index' }],
          });
          useCreateOrUpdateSloMock.mockReturnValue({
            loading: false,
            success: false,
            error: '',
            createSlo: jest.fn(),
            updateSlo: jest.fn(),
          });
          render(<SloEditPage />, config);

          expect(screen.queryByTestId('slosEditPage')).toBeTruthy();
          expect(screen.queryByTestId('sloForm')).toBeTruthy();

          expect(screen.queryByTestId('sloFormIndicatorTypeSelect')).toHaveValue(
            anSLO.indicator.type
          );

          expect(screen.queryByTestId('sloFormCustomKqlIndexInput')).toHaveValue(
            anSLO.indicator.params.index
          );
          expect(screen.queryByTestId('sloFormCustomKqlFilterQueryInput')).toHaveValue(
            anSLO.indicator.type === 'sli.kql.custom' ? anSLO.indicator.params.filter : ''
          );
          expect(screen.queryByTestId('sloFormCustomKqlGoodQueryInput')).toHaveValue(
            anSLO.indicator.type === 'sli.kql.custom' ? anSLO.indicator.params.good : ''
          );
          expect(screen.queryByTestId('sloFormCustomKqlTotalQueryInput')).toHaveValue(
            anSLO.indicator.type === 'sli.kql.custom' ? anSLO.indicator.params.total : ''
          );

          expect(screen.queryByTestId('sloFormBudgetingMethodSelect')).toHaveValue(
            anSLO.budgetingMethod
          );
          expect(screen.queryByTestId('sloFormTimeWindowDurationSelect')).toHaveValue(
            anSLO.timeWindow.duration
          );
          expect(screen.queryByTestId('sloFormObjectiveTargetInput')).toHaveValue(
            anSLO.objective.target * 100
          );

          expect(screen.queryByTestId('sloFormNameInput')).toHaveValue(anSLO.name);
          expect(screen.queryByTestId('sloFormDescriptionTextArea')).toHaveValue(anSLO.description);
        });

        it('calls the updateSlo hook if all required values are filled in', async () => {
          // Note: the `anSLO` object is considered to have (at least)
          // values for all required fields.

          jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });

          useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
          useFetchIndicesMock.mockReturnValue({
            loading: false,
            indices: [{ name: 'some-index' }],
          });
          useFetchSloMock.mockReturnValue({ loading: false, slo: anSLO });
          const mockCreate = jest.fn();
          const mockUpdate = jest.fn();
          useCreateOrUpdateSloMock.mockReturnValue({
            loading: false,
            success: false,
            error: '',
            createSlo: mockCreate,
            updateSlo: mockUpdate,
          });

          render(<SloEditPage />, config);

          await waitFor(() => expect(screen.queryByTestId('sloFormSubmitButton')).toBeEnabled());

          fireEvent.click(screen.queryByTestId('sloFormSubmitButton')!);

          expect(mockUpdate).toMatchInlineSnapshot(`
          [MockFunction] {
            "calls": Array [
              Array [
                "2f17deb0-725a-11ed-ab7c-4bb641cfc57e",
                Object {
                  "budgetingMethod": "occurrences",
                  "description": "some description useful",
                  "indicator": Object {
                    "params": Object {
                      "filter": "baz: foo and bar > 2",
                      "good": "http_status: 2xx",
                      "index": "some-index",
                      "total": "a query",
                    },
                    "type": "sli.kql.custom",
                  },
                  "name": "super important level service",
                  "objective": Object {
                    "target": 0.98,
                  },
                  "settings": Object {
                    "frequency": "1m",
                    "syncDelay": "1m",
                    "timestampField": "@timestamp",
                  },
                  "timeWindow": Object {
                    "duration": "30d",
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

        it('blocks submitting if not all required values are filled in', async () => {
          // Note: the `anSLO` object is considered to have (at least)
          // values for all required fields.

          jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });

          useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
          useFetchIndicesMock.mockReturnValue({
            loading: false,
            indices: [],
          });
          useFetchSloMock.mockReturnValue({ loading: false, slo: { ...anSLO, name: '' } });

          render(<SloEditPage />, config);

          await waitFor(() => {
            expect(screen.queryByTestId('sloFormSubmitButton')).toBeDisabled();
          });
        });
      });

      describe('when submitting has completed successfully', () => {
        it('renders a success toast', async () => {
          // Note: the `anSLO` object is considered to have (at least)
          // values for all required fields.
          jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });

          useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
          useFetchSloMock.mockReturnValue({ loading: false, slo: anSLO });
          useFetchIndicesMock.mockReturnValue({
            loading: false,
            indices: [{ name: 'some-index' }],
          });
          useCreateOrUpdateSloMock.mockReturnValue({
            loading: false,
            success: true,
            error: '',
            createSlo: jest.fn(),
            updateSlo: jest.fn(),
          });
          render(<SloEditPage />, config);
          expect(mockAddSuccess).toBeCalled();
        });

        it('navigates to the SLO List page', async () => {
          // Note: the `anSLO` object is considered to have (at least)
          // values for all required fields.
          jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });

          useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
          useFetchSloMock.mockReturnValue({ loading: false, slo: anSLO });
          useFetchIndicesMock.mockReturnValue({
            loading: false,
            indices: [{ name: 'some-index' }],
          });
          useCreateOrUpdateSloMock.mockReturnValue({
            loading: false,
            success: true,
            error: '',
            createSlo: jest.fn(),
            updateSlo: jest.fn(),
          });
          render(<SloEditPage />, config);
          expect(mockNavigate).toBeCalledWith(mockBasePathPrepend(paths.observability.slos));
        });
      });

      describe('when submitting has not completed successfully', () => {
        it('renders an error toast', async () => {
          // Note: the `anSLO` object is considered to have (at least)
          // values for all required fields.
          jest.spyOn(Router, 'useParams').mockReturnValue({ sloId: '123' });

          useLicenseMock.mockReturnValue({ hasAtLeast: () => true });
          useFetchSloMock.mockReturnValue({ loading: false, slo: anSLO });
          useFetchIndicesMock.mockReturnValue({
            loading: false,
            indices: [{ name: 'some-index' }],
          });
          useCreateOrUpdateSloMock.mockReturnValue({
            loading: false,
            success: false,
            error: 'Argh, API died',
            createSlo: jest.fn(),
            updateSlo: jest.fn(),
          });
          render(<SloEditPage />, config);
          expect(mockAddError).toBeCalled();
        });
      });
    });
  });
});
