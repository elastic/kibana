/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CasesPanel } from '.';
import { TestProviders } from '../../../../../../common/mock';
import {
  mockAlertDetailsTimelineResponse,
  mockAlertNestedDetailsTimelineResponse,
} from '../../../__mocks__';
import {
  ADD_TO_EXISTING_CASE_BUTTON,
  ADD_TO_NEW_CASE_BUTTON,
  ERROR_LOADING_CASES,
  LOADING_CASES,
} from '../translation';
import { useGetRelatedCasesByEvent } from '../../../../../../common/containers/cases/use_get_related_cases_by_event';
import { useGetUserCasesPermissions } from '../../../../../../common/lib/kibana';

jest.mock('../../../../../../common/containers/cases/use_get_related_cases_by_event');
jest.mock('../../../../../../common/lib/kibana');

describe('AlertDetailsPage - SummaryTab - CasesPanel', () => {
  describe('No data', () => {
    it('should render the loading panel', () => {
      (useGetRelatedCasesByEvent as jest.Mock).mockReturnValue({
        loading: true,
      });
      render(
        <TestProviders>
          <CasesPanel
            eventId={mockAlertNestedDetailsTimelineResponse._id}
            dataAsNestedObject={mockAlertNestedDetailsTimelineResponse}
            detailsData={mockAlertDetailsTimelineResponse}
          />
        </TestProviders>
      );
      expect(screen.getByText(LOADING_CASES)).toBeVisible();
    });

    it('should render the error panel if an error is returned', () => {
      (useGetRelatedCasesByEvent as jest.Mock).mockReturnValue({
        loading: false,
        error: true,
      });
      render(
        <TestProviders>
          <CasesPanel
            eventId={mockAlertNestedDetailsTimelineResponse._id}
            dataAsNestedObject={mockAlertNestedDetailsTimelineResponse}
            detailsData={mockAlertDetailsTimelineResponse}
          />
        </TestProviders>
      );

      expect(screen.getByText(ERROR_LOADING_CASES)).toBeVisible();
    });

    it('should render the error panel if data is undefined', () => {
      (useGetRelatedCasesByEvent as jest.Mock).mockReturnValue({
        loading: false,
        error: false,
        relatedCases: undefined,
      });
      render(
        <TestProviders>
          <CasesPanel
            eventId={mockAlertNestedDetailsTimelineResponse._id}
            dataAsNestedObject={mockAlertNestedDetailsTimelineResponse}
            detailsData={mockAlertDetailsTimelineResponse}
          />
        </TestProviders>
      );

      expect(screen.getByText(ERROR_LOADING_CASES)).toBeVisible();
    });

    describe('Partial permissions', () => {
      it('should only render the add to new case button', () => {
        (useGetRelatedCasesByEvent as jest.Mock).mockReturnValue({
          loading: false,
          relatedCases: [],
        });
        (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
          create: true,
          update: false,
        });
        render(
          <TestProviders>
            <CasesPanel
              eventId={mockAlertNestedDetailsTimelineResponse._id}
              dataAsNestedObject={mockAlertNestedDetailsTimelineResponse}
              detailsData={mockAlertDetailsTimelineResponse}
            />
          </TestProviders>
        );

        expect(screen.queryByTestId('add-to-new-case-button')).toBeVisible();
        expect(screen.queryByTestId('add-to-existing-case-button')).toBe(null);
      });

      it('should only render the add to existing case button', () => {
        (useGetRelatedCasesByEvent as jest.Mock).mockReturnValue({
          loading: false,
          relatedCases: [],
        });
        (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
          create: false,
          update: true,
        });
        render(
          <TestProviders>
            <CasesPanel
              eventId={mockAlertNestedDetailsTimelineResponse._id}
              dataAsNestedObject={mockAlertNestedDetailsTimelineResponse}
              detailsData={mockAlertDetailsTimelineResponse}
            />
          </TestProviders>
        );

        expect(screen.queryByTestId('add-to-existing-case-button')).toBeVisible();
        expect(screen.queryByTestId('add-to-new-case-button')).toBe(null);
      });

      it('should render both add to new case and add to existing case buttons', () => {
        (useGetRelatedCasesByEvent as jest.Mock).mockReturnValue({
          loading: false,
          relatedCases: [],
        });
        (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
          create: true,
          update: true,
        });
        render(
          <TestProviders>
            <CasesPanel
              eventId={mockAlertNestedDetailsTimelineResponse._id}
              dataAsNestedObject={mockAlertNestedDetailsTimelineResponse}
              detailsData={mockAlertDetailsTimelineResponse}
            />
          </TestProviders>
        );

        expect(screen.queryByText(ADD_TO_NEW_CASE_BUTTON)).toBeVisible();
        expect(screen.queryByText(ADD_TO_EXISTING_CASE_BUTTON)).toBeVisible();
      });
    });
  });
  describe('has related cases', () => {
    const mockRelatedCase = {
      title: 'test case',
      id: 'test-case-id',
    };

    beforeEach(() => {
      (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
        create: true,
        update: true,
      });
      (useGetRelatedCasesByEvent as jest.Mock).mockReturnValue({
        loading: false,
        relatedCases: [mockRelatedCase],
      });
    });

    it('should show the related case', () => {
      render(
        <TestProviders>
          <CasesPanel
            eventId={mockAlertNestedDetailsTimelineResponse._id}
            dataAsNestedObject={mockAlertNestedDetailsTimelineResponse}
            detailsData={mockAlertDetailsTimelineResponse}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('case-panel')).toHaveTextContent(mockRelatedCase.title);
    });
  });
});
