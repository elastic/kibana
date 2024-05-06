/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../mock';
import { useKibana as mockUseKibana } from '../../../lib/kibana/__mocks__';
import { RelatedCases } from './related_cases';
import { noCasesPermissions, readCasesPermissions } from '../../../../cases_test_utils';
import { CASES_LOADING, CASES_COUNT } from './translations';
import { useTourContext } from '../../guided_onboarding_tour';
import { AlertsCasesTourSteps } from '../../guided_onboarding_tour/tour_config';

const mockedUseKibana = mockUseKibana();
const mockGetRelatedCases = jest.fn();
const mockCanUseCases = jest.fn();

jest.mock('../../guided_onboarding_tour');
jest.mock('../../../lib/kibana', () => {
  const original = jest.requireActual('../../../lib/kibana');

  return {
    ...original,
    useToasts: jest.fn().mockReturnValue({ addWarning: jest.fn() }),
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        cases: {
          api: {
            getRelatedCases: mockGetRelatedCases,
          },
          helpers: { canUseCases: mockCanUseCases },
        },
      },
    }),
  };
});

const eventId = '1c84d9bff4884dabe6aa1bb15f08433463b848d9269e587078dc56669550d27a';
const scrollToMock = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollToMock;

describe('Related Cases', () => {
  beforeEach(() => {
    mockCanUseCases.mockReturnValue(readCasesPermissions());
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: AlertsCasesTourSteps.viewCase,
      incrementStep: () => null,
      endTourStep: () => null,
      isTourShown: () => false,
    });
    jest.clearAllMocks();
  });
  describe('When user does not have cases read permissions', () => {
    beforeEach(() => {
      mockCanUseCases.mockReturnValue(noCasesPermissions());
    });
    test('should not show related cases when user does not have permissions', async () => {
      await act(async () => {
        render(
          <TestProviders>
            <RelatedCases eventId={eventId} />
          </TestProviders>
        );
      });
      expect(screen.queryByText('cases')).toBeNull();
    });
  });
  describe('When user does have case read permissions', () => {
    test('Should show the loading message', async () => {
      await act(async () => {
        mockGetRelatedCases.mockReturnValue([]);
        render(
          <TestProviders>
            <RelatedCases eventId={eventId} />
          </TestProviders>
        );
        expect(screen.getByText(CASES_LOADING)).toBeInTheDocument();
      });
    });

    test('Should show 0 related cases when there are none', async () => {
      await act(async () => {
        mockGetRelatedCases.mockReturnValue([]);
        render(
          <TestProviders>
            <RelatedCases eventId={eventId} />
          </TestProviders>
        );
      });

      expect(screen.getByText(CASES_COUNT(0))).toBeInTheDocument();
    });

    test('Should show 1 related case', async () => {
      await act(async () => {
        mockGetRelatedCases.mockReturnValue([{ id: '789', title: 'Test Case' }]);
        render(
          <TestProviders>
            <RelatedCases eventId={eventId} />
          </TestProviders>
        );
      });
      expect(screen.getByText(CASES_COUNT(1))).toBeInTheDocument();
      expect(screen.getByTestId('case-details-link')).toHaveTextContent('Test Case');
    });

    test('Should show 2 related cases', async () => {
      await act(async () => {
        mockGetRelatedCases.mockReturnValue([
          { id: '789', title: 'Test Case 1' },
          { id: '456', title: 'Test Case 2' },
        ]);
        render(
          <TestProviders>
            <RelatedCases eventId={eventId} />
          </TestProviders>
        );
      });
      expect(screen.getByText(CASES_COUNT(2))).toBeInTheDocument();
      const cases = screen.getAllByTestId('case-details-link');
      expect(cases).toHaveLength(2);
      expect(cases[0]).toHaveTextContent('Test Case 1');
      expect(cases[1]).toHaveTextContent('Test Case 2');
    });

    test('Should not open the related cases accordion when isTourActive=false', async () => {
      mockGetRelatedCases.mockReturnValue([{ id: '789', title: 'Test Case' }]);
      await act(async () => {
        render(
          <TestProviders>
            <RelatedCases eventId={eventId} />
          </TestProviders>
        );
      });
      expect(scrollToMock).not.toHaveBeenCalled();
      expect(
        screen.getByTestId('RelatedCases-accordion').classList.contains('euiAccordion-isOpen')
      ).toBe(false);
    });

    test('Should automatically open the related cases accordion when isTourActive=true', async () => {
      (useTourContext as jest.Mock).mockReturnValue({
        activeStep: AlertsCasesTourSteps.viewCase,
        incrementStep: () => null,
        endTourStep: () => null,
        isTourShown: () => true,
      });
      mockGetRelatedCases.mockReturnValue([{ id: '789', title: 'Test Case' }]);
      await act(async () => {
        render(
          <TestProviders>
            <RelatedCases eventId={eventId} />
          </TestProviders>
        );
      });
      expect(scrollToMock).toHaveBeenCalled();
      expect(
        screen.getByTestId('RelatedCases-accordion').classList.contains('euiAccordion-isOpen')
      ).toBe(true);
    });
  });
});
