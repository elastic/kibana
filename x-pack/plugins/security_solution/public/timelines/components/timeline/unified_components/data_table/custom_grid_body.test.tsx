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
import { mockTimelineData } from '../../../../../common/mock';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { defaultUdtHeaders } from '../default_headers';
import type { EuiDataGridColumn } from '@elastic/eui';

const testDataRows = structuredClone(mockTimelineData);

const MockCellComponent = ({
  colIndex,
  visibleRowIndex,
}: {
  colIndex: number;
  visibleRowIndex: number;
}) => <div>{`Cell-${visibleRowIndex}-${colIndex}`}</div>;

const defaultProps: RenderCustomBodyProps = {
  Cell: MockCellComponent,
  visibleRowData: { startRow: 0, endRow: 2, visibleRowCount: 2 },
  rows: testDataRows as Array<DataTableRecord & TimelineItem>,
  enabledRowRenderers: [],
  visibleColumns: ['@timestamp', 'message', 'user.name'].map(
    (id) => defaultUdtHeaders.find((h) => h.id === id) as EuiDataGridColumn
  ),
  setCustomGridBodyProps: jest.fn(),
};

const renderTestComponents = (props?: RenderCustomBodyProps) => {
  const finalProps = props ? { ...defaultProps, ...props } : defaultProps;

  return render(<RenderCustomBody {...finalProps} />);
};

describe('CustomGridBody', () => {});
