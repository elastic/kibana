/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { RenderCustomBodyProps } from './custom_grid_body';
import { RenderCustomBody } from './custom_grid_body';
import { mockTimelineData, TestProviders } from '../../../../../common/mock';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { defaultUdtHeaders } from '../default_headers';
import type { EuiDataGridColumn } from '@elastic/eui';
import { useStatefulRowRenderer } from '../../body/events/stateful_row_renderer/use_stateful_row_renderer';

const testDataRows = structuredClone(mockTimelineData);

jest.mock('../../body/events/stateful_row_renderer/use_stateful_row_renderer');

const MockCellComponent = ({
  colIndex,
  visibleRowIndex,
}: {
  colIndex: number;
  visibleRowIndex: number;
}) => <div>{`Cell-${visibleRowIndex}-${colIndex}`}</div>;

const additionalColumn = {
  id: 'additional-row-details',
};

const mockVisibleColumns = ['@timestamp', 'message', 'user.name']
  .map((id) => defaultUdtHeaders.find((h) => h.id === id) as EuiDataGridColumn)
  .concat(additionalColumn);

const defaultProps: RenderCustomBodyProps = {
  Cell: MockCellComponent,
  visibleRowData: { startRow: 0, endRow: 2, visibleRowCount: 2 },
  rows: testDataRows as Array<DataTableRecord & TimelineItem>,
  enabledRowRenderers: [],
  setCustomGridBodyProps: jest.fn(),
  visibleColumns: mockVisibleColumns,
};

const renderTestComponents = (props?: RenderCustomBodyProps) => {
  const finalProps = props ? { ...defaultProps, ...props } : defaultProps;

  return render(
    <TestProviders>
      <RenderCustomBody {...finalProps} />
    </TestProviders>
  );
};

describe('CustomGridBody', () => {
  beforeEach(() => {
    (useStatefulRowRenderer as jest.Mock).mockReturnValue({
      canShowRowRenderer: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render exactly as snapshots', () => {
    // mainly to make sure that if styling is changed the test fails and the developer is
    // aware of the change that affected this component
    const { container } = renderTestComponents();
    expect(container).toMatchSnapshot();
  });

  it('should render the additional Row when row Renderer is available', () => {
    // No additional row for first result
    (useStatefulRowRenderer as jest.Mock).mockReturnValueOnce({
      canShowRowRenderer: false,
    });
    // Additional row for second result
    (useStatefulRowRenderer as jest.Mock).mockReturnValueOnce({
      canShowRowRenderer: true,
    });
    const { getByText, queryByText } = renderTestComponents();
    expect(queryByText('Cell-0-3')).toBeFalsy();
    expect(getByText('Cell-1-3')).toBeInTheDocument();
  });
});
