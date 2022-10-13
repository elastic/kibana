/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { noop } from 'lodash/fp';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../../../../common/mock';
import { useRuleDetailsContextMock } from '../__mocks__/rule_details_context';
import { getRuleExecutionResultsResponseMock } from '../../../../../../common/detection_engine/rule_monitoring/mocks';

import { useExecutionResults } from '../../../../rule_monitoring';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { useRuleDetailsContext } from '../rule_details_context';
import { ExecutionLogTable } from './execution_log_table';

jest.mock('../../../../../common/containers/sourcerer');
jest.mock('../../../../rule_monitoring/components/execution_results_table/use_execution_results');
jest.mock('../rule_details_context');

const mockUseSourcererDataView = useSourcererDataView as jest.Mock;
mockUseSourcererDataView.mockReturnValue({
  indexPattern: { fields: [] },
  missingPatterns: {},
  selectedPatterns: {},
  scopeSelectedPatterns: {},
  loading: false,
});

const mockUseRuleExecutionEvents = useExecutionResults as jest.Mock;
mockUseRuleExecutionEvents.mockReturnValue({
  data: getRuleExecutionResultsResponseMock.getSomeResponse(),
  isLoading: false,
  isFetching: false,
});

describe('ExecutionLogTable', () => {
  test('Shows total events returned', () => {
    const ruleDetailsContext = useRuleDetailsContextMock.create();
    (useRuleDetailsContext as jest.Mock).mockReturnValue(ruleDetailsContext);
    render(<ExecutionLogTable ruleId={'0'} selectAlertsTab={noop} />, {
      wrapper: TestProviders,
    });
    expect(screen.getByTestId('executionsShowing')).toHaveTextContent('Showing 7 rule executions');
  });
});
