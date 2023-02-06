/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '../../../../../common/types';
import { render } from '@testing-library/react';
import React from 'react';
import { RowAction } from '.';
import { defaultHeaders, TestProviders } from '../../../mock';
import { getDefaultControlColumn } from '../../../../timelines/components/timeline/body/control_columns';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';

jest.mock('../../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;
useIsExperimentalFeatureEnabledMock.mockReturnValue(true);

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('RowAction', () => {
  const sampleData = {
    _id: '1',
    data: [],
    ecs: {
      _id: '1',
    },
  };
  const defaultProps = {
    columnHeaders: defaultHeaders,
    controlColumn: getDefaultControlColumn(5)[0],
    data: [sampleData],
    disabled: false,
    index: 1,
    isEventViewer: false,
    loadingEventIds: [],
    onRowSelected: jest.fn(),
    onRuleChange: jest.fn(),
    selectedEventIds: {},
    tableId: TableId.test,
    width: 100,
    setEventsLoading: jest.fn(),
    setEventsDeleted: jest.fn(),
    pageRowIndex: 0,
    columnId: 'test-columnId',
    isDetails: false,
    isExpanded: false,
    isExpandable: false,
    rowIndex: 0,
    colIndex: 0,
    setCellProps: jest.fn(),
    tabType: 'query',
    showCheckboxes: false,
  };
  test('displays expand events button', () => {
    const wrapper = render(
      <TestProviders>
        <RowAction {...defaultProps} />
      </TestProviders>
    );
    expect(wrapper.getAllByTestId('expand-event')).not.toBeNull();
  });
});
