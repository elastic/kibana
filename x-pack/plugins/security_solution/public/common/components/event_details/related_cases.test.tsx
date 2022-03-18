/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../mock';
import { useKibana as mockUseKibana } from '../../lib/kibana/__mocks__';
import { useGetUserCasesPermissions } from '../../lib/kibana';
import { RelatedCases } from './related_cases';

const mockedUseKibana = mockUseKibana();
const mockGetRelatedCases = jest.fn();

jest.mock('../../lib/kibana', () => {
  const original = jest.requireActual('../../lib/kibana');

  return {
    ...original,
    useGetUserCasesPermissions: jest.fn(),
    useToasts: jest.fn().mockReturnValue({ addWarning: jest.fn() }),
    useKibana: () => ({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        cases: {
          api: {
            getRelatedCases: mockGetRelatedCases,
          },
        },
      },
    }),
  };
});

const eventId = '1c84d9bff4884dabe6aa1bb15f08433463b848d9269e587078dc56669550d27a';

describe('Related Cases', () => {
  describe('When user does not have cases read permissions', () => {
    test('should not show related cases when user does not have permissions', () => {
      (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
        read: false,
      });
      act(() => {
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
    beforeEach(() => {
      (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
        read: true,
      });
    });

    describe('When related cases are unable to be retrieved', () => {
      test('should show 0 related cases when there are none', async () => {
        mockGetRelatedCases.mockReturnValue([]);
        act(() => {
          render(
            <TestProviders>
              <RelatedCases eventId={eventId} />
            </TestProviders>
          );
        });

        expect(await screen.findByText('0 cases.')).toBeInTheDocument();
      });
    });

    describe('When 1 related case is retrieved', () => {
      test('should show 1 related case', async () => {
        mockGetRelatedCases.mockReturnValue([{ id: '789', title: 'Test Case' }]);
        act(() => {
          render(
            <TestProviders>
              <RelatedCases eventId={eventId} />
            </TestProviders>
          );
        });

        expect(await screen.findByText('1 case:')).toBeInTheDocument();
        expect(await screen.findByTestId('case-details-link')).toHaveTextContent('Test Case');
      });
    });

    describe('When 2 related cases are retrieved', () => {
      test('should show 2 related cases', async () => {
        mockGetRelatedCases.mockReturnValue([
          { id: '789', title: 'Test Case 1' },
          { id: '456', title: 'Test Case 2' },
        ]);
        act(() => {
          render(
            <TestProviders>
              <RelatedCases eventId={eventId} />
            </TestProviders>
          );
        });

        expect(await screen.findByText('2 cases:')).toBeInTheDocument();
        const cases = await screen.findAllByTestId('case-details-link');
        expect(cases).toHaveLength(2);
        expect(cases[0]).toHaveTextContent('Test Case 1');
        expect(cases[1]).toHaveTextContent('Test Case 2');
      });
    });
  });
});
