/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect'; // For additional matchers like toHaveTextContent
import { RuleDefinitionSection } from './rule_definition_section';
import type {
  RuleResponse,
  AlertSuppressionMissingFieldsStrategy,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import * as useAlertSuppressionMock from '../../logic/use_alert_suppression';
import * as useGetSavedQueryMock from '../../../../detections/pages/detection_engine/rules/use_get_saved_query';
import * as useUpsellingMessageMock from '../../../../common/hooks/use_upselling';

jest.spyOn(useGetSavedQueryMock, 'useGetSavedQuery').mockReturnValue({
  isSavedQueryLoading: false,
  savedQueryBar: {
    saved_id: 'id',
    filters: [],
    query: {
      query: 'query',
      language: 'kquery',
    },
    title: 'title',
  },
  savedQuery: undefined,
});
jest
  .spyOn(useUpsellingMessageMock, 'useUpsellingMessage')
  .mockReturnValue(
    'Alert suppression is configured but will not be applied due to insufficient licensing'
  );

describe('RuleDefinitionSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('should render AlertSuppressionTitle and SuppressAlertsByField when group_by is present', () => {
    jest
      .spyOn(useAlertSuppressionMock, 'useAlertSuppression')
      .mockReturnValueOnce({ isSuppressionEnabled: true });
    const rule: Partial<RuleResponse> = {
      alert_suppression: {
        group_by: ['field1', 'field2'],
        duration: { value: 2, unit: 'h' },
        missing_fields_strategy: 'suppress' as AlertSuppressionMissingFieldsStrategy,
      },
    };

    render(<RuleDefinitionSection rule={rule} />);

    expect(screen.getByTestId('alertSuppressionGroupByPropertyTitle')).toBeInTheDocument();
    expect(screen.getByTestId('alertSuppressionDurationPropertyTitle')).toBeInTheDocument();
    expect(screen.getByTestId('alertSuppressionSuppressionFieldPropertyTitle')).toBeInTheDocument();
  });

  // TODO check if this is true o.O oh no!!!
  test('should render only AlertSuppressionTitle and SuppressAlertsDuration when group_by is not present', () => {
    jest
      .spyOn(useAlertSuppressionMock, 'useAlertSuppression')
      .mockReturnValueOnce({ isSuppressionEnabled: true });
    const rule: Partial<RuleResponse> = {
      alert_suppression: {
        duration: { value: 2, unit: 'h' },
        missing_fields_strategy: 'doNotSuppress' as AlertSuppressionMissingFieldsStrategy,
      },
    };

    render(<RuleDefinitionSection rule={rule} />);

    expect(screen.queryByTestId('alertSuppressionGroupByPropertyTitle')).not.toBeInTheDocument();

    expect(screen.getByTestId('alertSuppressionSuppressionFieldPropertyTitle')).toBeInTheDocument();
  });

  test('should not render anything when isSuppressionEnabled is false', () => {
    const rule: Partial<RuleResponse> = {
      alert_suppression: {
        group_by: ['field1', 'field2'],
        duration: { value: 2, unit: 'h' },
        missing_fields_strategy: 'doNotSuppress' as AlertSuppressionMissingFieldsStrategy,
      },
    };

    jest
      .spyOn(useAlertSuppressionMock, 'useAlertSuppression')
      .mockReturnValueOnce({ isSuppressionEnabled: false });

    render(<RuleDefinitionSection rule={rule} />);

    expect(screen.queryByTestId('alertSuppressionGroupByPropertyTitle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertSuppressionDurationPropertyTitle')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('alertSuppressionSuppressionFieldPropertyTitle')
    ).not.toBeInTheDocument();
  });
});
