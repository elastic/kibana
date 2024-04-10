/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RowRenderer } from '../../../../../../common/types';
import React from 'react';
import { mockTimelineData, TestProviders } from '../../../../../common/mock';
import { StatefulRowRenderer } from '../../body/events/stateful_row_renderer';
import type { AdditionalRowProps } from './additional_row';
import { AdditionalRow } from './additional_row';
import { render } from '@testing-library/react';
import { useTimelineUnifiedDataTableContext } from './use_timeline_unified_data_table_context';

const mockData = structuredClone(mockTimelineData);

const setCellPropsMock = jest.fn();

jest.mock('../../body/events/stateful_row_renderer');
jest.mock('./use_timeline_unified_data_table_context');

const renderTestComponent = (props: Partial<AdditionalRowProps> = {}) => {
  const finalProps: AdditionalRowProps = {
    rowIndex: 0,
    event: mockData[0],
    timelineId: 'test-timeline-id',
    enabledRowRenderers: [{}] as RowRenderer[],
    setCellProps: setCellPropsMock,
    isExpandable: true,
    isExpanded: false,
    isDetails: false,
    colIndex: 1,
    columnId: 'test-column-id',
    ...props,
  };
  return render(
    <TestProviders>
      <AdditionalRow {...finalProps} />
    </TestProviders>
  );
};

describe('AdditionalRow', () => {
  beforeEach(() => {
    (StatefulRowRenderer as jest.Mock).mockReturnValue(<div>{'Test Row Renderer'}</div>);

    (useTimelineUnifiedDataTableContext as jest.Mock).mockReturnValue({
      expanded: { id: undefined },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the AdditionalRow when row Renderer is available', () => {
    const { getByText } = renderTestComponent();

    expect(setCellPropsMock).toHaveBeenCalledWith({
      className: '',
      style: { width: '100%', height: 'auto' },
    });

    expect(getByText('Test Row Renderer')).toBeVisible();
  });

  it('should not render the AdditionalRow when row Renderer is not available', () => {
    const { queryByText } = renderTestComponent({
      enabledRowRenderers: [],
    });

    expect(queryByText('Test Row Renderer')).toBeFalsy();
  });

  it('should style additional row correctly when the row is expanded', () => {
    (useTimelineUnifiedDataTableContext as jest.Mock).mockReturnValue({
      expanded: { id: mockData[0]._id },
    });
    renderTestComponent();

    expect(setCellPropsMock).toHaveBeenCalledWith({
      className: 'unifiedDataTable__cell--expanded',
      style: { width: '100%', height: 'auto' },
    });
  });
});
