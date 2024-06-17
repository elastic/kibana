/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';
import { TestProviders } from '../../../mock';
import { useKibana as mockUseKibana } from '../../../lib/kibana/__mocks__';
import { RelatedCases } from './related_cases';
import { noCasesPermissions, readCasesPermissions } from '../../../../cases_test_utils';
import { CASES_LOADING, CASES_COUNT } from './translations';
import { useTourContext } from '../../guided_onboarding_tour';
import { AlertsCasesTourSteps } from '../../guided_onboarding_tour/tour_config';

const mockedUseKibana = mockUseKibana();

const mockCasesContract = casesPluginMock.createStartContract();
const mockGetRelatedCases = mockCasesContract.api.getRelatedCases as jest.Mock;
mockGetRelatedCases.mockReturnValue([{ id: '789', title: 'Test Case' }]);
const mockCanUseCases = mockCasesContract.helpers.canUseCases as jest.Mock;
mockCanUseCases.mockReturnValue(readCasesPermissions());

const mockUseTourContext = useTourContext as jest.Mock;

jest.mock('../../../lib/kibana', () => {
  const original = jest.requireActual('../../../lib/kibana');
  return {
    ...original,
    useToasts: jest.fn().mockReturnValue({ addWarning: jest.fn() }),
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        cases: mockCasesContract,
      },
    }),
  };
});

jest.mock('../../guided_onboarding_tour');
const defaultUseTourContextValue = {
  activeStep: AlertsCasesTourSteps.viewCase,
  incrementStep: () => null,
  endTourStep: () => null,
  isTourShown: () => false,
};

jest.mock('../../guided_onboarding_tour/tour_step');

const eventId = '1c84d9bff4884dabe6aa1bb15f08433463b848d9269e587078dc56669550d27a';
const scrollToMock = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollToMock;

describe('Related Cases', () => {
  beforeEach(() => {
    mockUseTourContext.mockReturnValue(defaultUseTourContextValue);
    jest.clearAllMocks();
  });

  describe('When user does not have cases read permissions', () => {
    beforeEach(() => {
      mockCanUseCases.mockReturnValue(noCasesPermissions());
    });

    test('should not show related cases when user does not have permissions', async () => {
      await act(async () => {
        render(<RelatedCases eventId={eventId} />, { wrapper: TestProviders });
      });
      expect(screen.queryByText('cases')).toBeNull();
    });
  });

  describe('When user does have case read permissions', () => {
    beforeEach(() => {
      mockCanUseCases.mockReturnValue(readCasesPermissions());
    });

    test('Should show the loading message', async () => {
      mockGetRelatedCases.mockReturnValueOnce([]);
      await act(async () => {
        render(<RelatedCases eventId={eventId} />, { wrapper: TestProviders });
        expect(screen.queryByText(CASES_LOADING)).toBeInTheDocument();
      });
      expect(screen.queryByText(CASES_LOADING)).not.toBeInTheDocument();
    });

    test('Should show 0 related cases when there are none', async () => {
      mockGetRelatedCases.mockReturnValueOnce([]);
      await act(async () => {
        render(<RelatedCases eventId={eventId} />, { wrapper: TestProviders });
      });

      expect(screen.getByText(CASES_COUNT(0))).toBeInTheDocument();
    });

    test('Should show 1 related case', async () => {
      await act(async () => {
        render(<RelatedCases eventId={eventId} />, { wrapper: TestProviders });
      });
      expect(screen.getByText(CASES_COUNT(1))).toBeInTheDocument();
      expect(screen.getByTestId('case-details-link')).toHaveTextContent('Test Case');
    });

    test('Should show 2 related cases', async () => {
      mockGetRelatedCases.mockReturnValueOnce([
        { id: '789', title: 'Test Case 1' },
        { id: '456', title: 'Test Case 2' },
      ]);
      await act(async () => {
        render(<RelatedCases eventId={eventId} />, { wrapper: TestProviders });
      });
      expect(screen.getByText(CASES_COUNT(2))).toBeInTheDocument();
      const cases = screen.getAllByTestId('case-details-link');
      expect(cases).toHaveLength(2);
      expect(cases[0]).toHaveTextContent('Test Case 1');
      expect(cases[1]).toHaveTextContent('Test Case 2');
    });

    test('Should not open the related cases accordion when isTourActive=false', async () => {
      await act(async () => {
        render(<RelatedCases eventId={eventId} />, { wrapper: TestProviders });
      });
      expect(scrollToMock).not.toHaveBeenCalled();
      expect(
        screen.getByTestId('RelatedCases-accordion').classList.contains('euiAccordion-isOpen')
      ).toBe(false);
    });

    test('Should automatically open the related cases accordion when isTourActive=true', async () => {
      // this hook is called twice, so we can not use mockReturnValueOnce
      mockUseTourContext.mockReturnValue({
        ...defaultUseTourContextValue,
        isTourShown: () => true,
      });
      await act(async () => {
        render(<RelatedCases eventId={eventId} />, { wrapper: TestProviders });
      });
      expect(scrollToMock).toHaveBeenCalled();
      expect(
        screen.getByTestId('RelatedCases-accordion').classList.contains('euiAccordion-isOpen')
      ).toBe(true);
    });
  });
});
