/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { RelatedCaseInfo } from '@kbn/cases-plugin/common/api';
import { CaseStatuses } from '@kbn/cases-plugin/common/api';
import { CasesPanel, CASES_PANEL_CASES_COUNT_MAX } from '.';
import { TestProviders } from '../../../../../../common/mock';
import {
  mockAlertDetailsTimelineResponse,
  mockAlertNestedDetailsTimelineResponse,
} from '../../../__mocks__';
import { ERROR_LOADING_CASES, LOADING_CASES } from '../translation';
import { useGetRelatedCasesByEvent } from '../../../../../../common/containers/cases/use_get_related_cases_by_event';
import { useGetUserCasesPermissions } from '../../../../../../common/lib/kibana';

jest.mock('../../../../../../common/containers/cases/use_get_related_cases_by_event');
jest.mock('../../../../../../common/lib/kibana');

const defaultPanelProps = {
  eventId: mockAlertNestedDetailsTimelineResponse._id,
  dataAsNestedObject: mockAlertNestedDetailsTimelineResponse,
  detailsData: mockAlertDetailsTimelineResponse,
};

describe('AlertDetailsPage - SummaryTab - CasesPanel', () => {
  describe('No data', () => {
    beforeEach(() => {
      (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
        create: true,
        update: true,
      });
    });
    it('should render the loading panel', () => {
      (useGetRelatedCasesByEvent as jest.Mock).mockReturnValue({
        loading: true,
      });
      const { getByText } = render(
        <TestProviders>
          <CasesPanel {...defaultPanelProps} />
        </TestProviders>
      );
      expect(getByText(LOADING_CASES)).toBeVisible();
    });

    it('should render the error panel if an error is returned', () => {
      (useGetRelatedCasesByEvent as jest.Mock).mockReturnValue({
        loading: false,
        error: true,
      });
      const { getByText } = render(
        <TestProviders>
          <CasesPanel {...defaultPanelProps} />
        </TestProviders>
      );

      expect(getByText(ERROR_LOADING_CASES)).toBeVisible();
    });

    it('should render the error panel if data is undefined', () => {
      (useGetRelatedCasesByEvent as jest.Mock).mockReturnValue({
        loading: false,
        error: false,
        relatedCases: undefined,
      });
      const { getByText } = render(
        <TestProviders>
          <CasesPanel {...defaultPanelProps} />
        </TestProviders>
      );

      expect(getByText(ERROR_LOADING_CASES)).toBeVisible();
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
        const { getByTestId, queryByTestId } = render(
          <TestProviders>
            <CasesPanel {...defaultPanelProps} />
          </TestProviders>
        );

        expect(getByTestId('add-to-new-case-button')).toBeVisible();
        expect(queryByTestId('add-to-existing-case-button')).toBe(null);
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
        const { getByTestId, queryByTestId } = render(
          <TestProviders>
            <CasesPanel {...defaultPanelProps} />
          </TestProviders>
        );

        expect(getByTestId('add-to-existing-case-button')).toBeVisible();
        expect(queryByTestId('add-to-new-case-button')).toBe(null);
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
        const { getByTestId, queryByTestId } = render(
          <TestProviders>
            <CasesPanel {...defaultPanelProps} />
          </TestProviders>
        );

        expect(getByTestId('add-to-new-case-button')).toBeVisible();
        expect(queryByTestId('add-to-existing-case-button')).toBeVisible();
      });
    });
  });
  describe('has a single related cases', () => {
    const mockRelatedCase: RelatedCaseInfo = {
      createdAt: '2022-11-04T17:22:13.267Z',
      title: 'test case',
      description: 'Test case description',
      status: CaseStatuses.open,
      id: 'test-case-id',
      totals: {
        alerts: 2,
        userComments: 4,
      },
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
      const { getByTestId } = render(
        <TestProviders>
          <CasesPanel {...defaultPanelProps} />
        </TestProviders>
      );

      expect(getByTestId('case-panel')).toHaveTextContent(mockRelatedCase.title);
      expect(getByTestId('case-panel')).toHaveTextContent(mockRelatedCase.description);
      expect(getByTestId('case-panel')).toHaveTextContent(`${mockRelatedCase.totals.alerts}`);
      expect(getByTestId('case-panel')).toHaveTextContent(`${mockRelatedCase.totals.userComments}`);
    });
  });
  describe(`has more than ${CASES_PANEL_CASES_COUNT_MAX} related cases`, () => {
    const mockRelatedCase: RelatedCaseInfo = {
      createdAt: '2022-11-04T17:22:13.267Z',
      title: 'test case',
      description: 'Test case description',
      status: CaseStatuses.open,
      id: 'test-case-id',
      totals: {
        alerts: 2,
        userComments: 4,
      },
    };

    const mockRelatedCaseList = Array.from(Array(CASES_PANEL_CASES_COUNT_MAX + 3).keys()).map(
      (position) => ({
        ...mockRelatedCase,
        title: `test case ${position + 1}`,
        id: `test-case-id-${position + 1}`,
      })
    );

    beforeEach(() => {
      (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
        create: true,
        update: true,
      });
      (useGetRelatedCasesByEvent as jest.Mock).mockReturnValue({
        loading: false,
        relatedCases: mockRelatedCaseList,
      });
    });

    it('should show the related case', () => {
      const { getByTestId } = render(
        <TestProviders>
          <CasesPanel {...defaultPanelProps} />
        </TestProviders>
      );

      expect(getByTestId('case-panel')).toHaveTextContent(
        `test case ${CASES_PANEL_CASES_COUNT_MAX}`
      );
      expect(getByTestId('case-panel')).not.toHaveTextContent(
        `test case ${CASES_PANEL_CASES_COUNT_MAX + 1}`
      );
    });
  });
});
